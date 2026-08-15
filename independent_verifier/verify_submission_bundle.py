#!/usr/bin/env python3
"""Dependency-free independent verifier for portable submission evidence."""

import base64
import hashlib
import json
import math
import sys
from pathlib import Path

from verify_release import area, fingerprint, triangle_from_sides, verify


def compact(value):
    if isinstance(value, dict):
        return "{" + ",".join(
            json.dumps(key, ensure_ascii=False) + ":" + compact(item)
            for key, item in value.items()
        ) + "}"
    if isinstance(value, list):
        return "[" + ",".join(compact(item) for item in value) + "]"
    if isinstance(value, bool):
        return "true" if value else "false"
    if value is None:
        return "null"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        if value.is_integer():
            return str(int(value))
        rendered = repr(value)
        return rendered.replace("e-0", "e-").replace("e+0", "e+")
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def digest_bytes(value):
    return hashlib.sha256(value).hexdigest()


def snapshot_source_digest(records):
    source = [{
        "id": record["id"],
        "problem": record["problem"],
        "placements": record["solution"]["placements"],
        "verification": record["verification"],
    } for record in records]
    return digest_bytes(compact(source).encode())


def attested_result(result):
    report = result.get("report") or {}
    comparison = report.get("comparison") or {}
    error = result.get("error") or {}
    return {
        "path": result.get("path"),
        "candidateSha256": result.get("candidateSha256"),
        "candidatePayloadBase64": result.get("candidatePayloadBase64"),
        "disposition": report.get("disposition"),
        "incumbentIndexDigest": comparison.get("incumbentIndexDigest"),
        "errorCode": error.get("code"),
    }


def verify_attestation(bundle):
    attestation = bundle.get("attestation") or {}
    snapshot = bundle.get("incumbentSnapshot")
    statement = {
        "format": "triangle-packing-submission-attestation/v1",
        "incumbentIndexDigest": attestation.get("incumbentIndexDigest"),
        "incumbentSnapshotSha256": None if snapshot is None else digest_bytes(compact(snapshot).encode()),
        "results": [attested_result(result) for result in bundle.get("results", [])],
    }
    return (attestation.get("format") == statement["format"]
            and attestation.get("sha256") == digest_bytes(compact(statement).encode())
            and attestation.get("results") == statement["results"])


def rounded(value):
    result = round(float(value), 9)
    return 0 if result == 0 else result


def problem_identity(problem):
    counts = {}
    for triangle in problem["triangles"]:
        signature = ",".join(str(value).lower() for value in sorted(rounded(side) for side in triangle["sides"]))
        counts[signature] = counts.get(signature, 0) + 1
    homogeneous = len(counts) == 1
    return compact({
        "width": rounded(problem["width"]),
        "height": rounded(problem["height"]),
        "margin": rounded(problem.get("margin", 0)),
        "kerf": rounded(problem.get("kerf", 0)),
        "allowRotation": problem.get("allowRotation", True),
        "allowReflection": problem.get("allowReflection", False),
        "fillSheet": problem.get("fillSheet", False),
        "inventory": [{"signature": signature, "count": "variable" if homogeneous else counts[signature]}
                      for signature in sorted(counts)],
    })


def schema_valid(candidate):
    provenance = candidate.get("provenance") or {}
    return (candidate.get("format") == "triangle-packing-atlas/v1"
            and isinstance(candidate.get("id"), str) and bool(candidate["id"])
            and isinstance((candidate.get("solution") or {}).get("placements"), list)
            and isinstance((candidate.get("solution") or {}).get("construction"), str)
            and isinstance(provenance.get("version"), str) and bool(provenance["version"].strip())
            and isinstance(provenance.get("contributor"), str) and bool(provenance["contributor"].strip())
            and provenance.get("license") == "CC-BY-4.0"
            and isinstance(provenance.get("runtimeMs"), (int, float))
            and not isinstance(provenance.get("runtimeMs"), bool)
            and math.isfinite(provenance["runtimeMs"]) and provenance["runtimeMs"] >= 0
            and ((isinstance(provenance.get("seed"), str) and 0 < len(provenance["seed"].strip()) <= 256)
                 or (isinstance(provenance.get("seed"), (int, float))
                     and not isinstance(provenance.get("seed"), bool)
                     and math.isfinite(provenance["seed"]))))


def candidate_geometry(candidate):
    clone = json.loads(compact(candidate))
    placements = clone["solution"]["placements"]
    pieces = clone["problem"]["triangles"]
    utilization = sum(area(triangle_from_sides(*pieces[index]["sides"]))
                      for index in range(len(placements))) / (
        (clone["problem"]["width"] - 2 * clone["problem"].get("margin", 0))
        * (clone["problem"]["height"] - 2 * clone["problem"].get("margin", 0)))
    clone["verification"] = {"fingerprint": fingerprint(clone), "utilization": utilization}
    return verify(clone) == [], clone["verification"]


def expected_disposition(candidate, incumbents):
    if not schema_valid(candidate):
        return "reject_invalid"
    try:
        valid, verification = candidate_geometry(candidate)
        if not valid:
            return "reject_invalid"
        identity = problem_identity(candidate["problem"])
    except (IndexError, KeyError, TypeError, ValueError, ZeroDivisionError):
        return "reject_invalid"
    duplicate = next((record for record in incumbents
                      if record["verification"]["fingerprint"] == verification["fingerprint"]), None)
    comparable = [record for record in incumbents if problem_identity(record["problem"]) == identity]
    best = max(comparable, key=lambda record: record["verification"]["utilization"], default=None)
    if duplicate:
        return "reject_duplicate"
    if best and verification["utilization"] - best["verification"]["utilization"] <= 1e-9:
        return "reject_inferior"
    return "new_problem" if best is None else "improves_record"


def check_bundle(bundle):
    errors = []
    snapshot = bundle.get("incumbentSnapshot")
    if bundle.get("format") != "triangle-packing-submission-batch/v1":
        errors.append("INVALID_BUNDLE_FORMAT")
    if not isinstance(snapshot, list):
        errors.append("MISSING_INCUMBENT_SNAPSHOT")
        snapshot = []
    else:
        try:
            actual = snapshot_source_digest(snapshot)
            if actual != (bundle.get("attestation") or {}).get("incumbentIndexDigest"):
                errors.append("INCUMBENT_DIGEST_MISMATCH")
            for record in snapshot:
                if verify(record, verify_stability=False):
                    errors.append(f"INVALID_INCUMBENT:{record.get('id', '<missing>')}")
                    break
        except (IndexError, KeyError, TypeError, ValueError):
            errors.append("INVALID_INCUMBENT_SNAPSHOT")
    if not verify_attestation(bundle):
        errors.append("ATTESTATION_INVALID")
    for result in bundle.get("results", []):
        encoded = result.get("candidatePayloadBase64")
        if encoded is None:
            continue
        path = result.get("path")
        try:
            payload = base64.b64decode(encoded, validate=True)
        except (ValueError, TypeError):
            errors.append(f"CANDIDATE_UNREADABLE:{path}")
            continue
        if digest_bytes(payload) != result.get("candidateSha256"):
            errors.append(f"CANDIDATE_DRIFT:{path}")
        try:
            candidate = json.loads(payload)
        except (UnicodeDecodeError, json.JSONDecodeError):
            if (result.get("error") or {}).get("code") != "INVALID_JSON":
                errors.append(f"ERROR_REPLAY_MISMATCH:{path}")
            continue
        if expected_disposition(candidate, snapshot) != (result.get("report") or {}).get("disposition"):
            errors.append(f"DECISION_REPLAY_MISMATCH:{path}")
    return errors


def main():
    if len(sys.argv) != 2:
        print("Usage: verify_submission_bundle.py bundle.json", file=sys.stderr)
        return 2
    bundle = json.loads(Path(sys.argv[1]).read_text())
    errors = check_bundle(bundle)
    print(json.dumps({
        "format": "triangle-packing-submission-consensus/v1",
        "implementation": "python-stdlib-independent",
        "valid": not errors,
        "incumbents": len(bundle.get("incumbentSnapshot") or []),
        "candidates": len(bundle.get("results") or []),
        "errors": errors,
    }, indent=2))
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
