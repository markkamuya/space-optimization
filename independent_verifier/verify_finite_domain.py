#!/usr/bin/env python3
"""Independent stdlib replay for finite candidate-domain certificates."""

import hashlib
import json
import math
import sys
from pathlib import Path

from verify_release import triangle_from_sides, transform, overlaps, stable


def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def sha256(value):
    return hashlib.sha256(value.encode()).hexdigest()


def canonical_number(value, quantum):
    rounded = round(value / quantum) * quantum
    if rounded == 0:
        return 0
    return float(f"{rounded:.15g}")


def canonical_placement(x, y, angle, reflect, quantum):
    return {
        "x": canonical_number(x, quantum),
        "y": canonical_number(y, quantum),
        "angle": canonical_number(angle, quantum),
        "reflect": bool(reflect),
    }


def inside(points, width, height, epsilon):
    return all(-epsilon <= x <= width + epsilon and -epsilon <= y <= height + epsilon
               for x, y in points)


def regenerate_domain(domain):
    problem = domain["problem"]
    specification = domain["specification"]
    if specification.get("generator") != "cartesian-grid/v1":
        raise ValueError("unsupported_generator")
    quantum = specification["quantum"]
    shape = triangle_from_sides(*problem["sides"])
    x_count = math.floor(problem["width"] / specification["xStep"] + 1e-12)
    y_count = math.floor(problem["height"] / specification["yStep"] + 1e-12)
    candidates = []
    seen = set()
    for x_index in range(x_count + 1):
        for y_index in range(y_count + 1):
            for angle in specification["angles"]:
                for reflect in specification["reflections"]:
                    placement = canonical_placement(
                        x_index * specification["xStep"],
                        y_index * specification["yStep"], angle, reflect, quantum)
                    points = transform(shape, placement)
                    if not inside(points, problem["width"], problem["height"], quantum):
                        continue
                    key = compact(placement)
                    if key in seen:
                        continue
                    seen.add(key)
                    candidates.append(placement)
    candidates.sort(key=lambda item: (item["x"], item["y"], item["angle"], item["reflect"]))
    return candidates


def regenerate_graph(domain):
    shape = triangle_from_sides(*domain["problem"]["sides"])
    transformed = [transform(shape, candidate) for candidate in domain["candidates"]]
    adjacency = [[] for _ in transformed]
    edge_count = 0
    for left in range(len(transformed)):
        for right in range(left + 1, len(transformed)):
            if not overlaps(transformed[left], transformed[right]):
                continue
            adjacency[left].append(right)
            adjacency[right].append(left)
            edge_count += 1
    statement = {
        "domainSha256": domain["sha256"],
        "adjacency": adjacency,
        "edgeCount": edge_count,
    }
    return {
        "format": "tpa-finite-conflict-graph/v1",
        **statement,
        "sha256": sha256(stable(statement)),
    }


def verify_certificate(certificate):
    errors = []
    if certificate.get("format") != "triangle-packing-certificate/v3":
        errors.append("invalid_certificate_format")
    if (certificate.get("claim") != "optimal_within_declared_finite_candidate_domain"
            or certificate.get("globallyOptimal") is not False):
        errors.append("invalid_claim_boundary")
    domain = certificate.get("domain") or {}
    try:
        regenerated = regenerate_domain(domain)
        domain_statement = {
            "problem": domain["problem"],
            "specification": domain["specification"],
            "candidates": domain["candidates"],
        }
        if regenerated != domain["candidates"]:
            errors.append("candidate_domain_mismatch")
        if json.loads(domain.get("canonicalPayload", "null")) != domain_statement:
            errors.append("candidate_domain_payload_mismatch")
        if sha256(domain.get("canonicalPayload", "")) != domain.get("sha256"):
            errors.append("candidate_domain_digest_mismatch")
        graph = regenerate_graph(domain)
        if graph != certificate.get("conflictGraph"):
            errors.append("conflict_graph_mismatch")
    except (KeyError, TypeError, ValueError, ZeroDivisionError):
        graph = None
        errors.append("invalid_candidate_domain")
    selected = certificate.get("selectedIndices") or []
    cover = certificate.get("cliqueCover") or []
    if graph:
        adjacent = [set(neighbors) for neighbors in graph["adjacency"]]
        if len(set(selected)) != len(selected) or any(not isinstance(index, int) or index < 0 or index >= len(adjacent)
                                                      for index in selected):
            errors.append("invalid_selected_indices")
        else:
            for offset, left in enumerate(selected):
                if any(right in adjacent[left] for right in selected[offset + 1:]):
                    errors.append("selected_conflict")
        flattened = [index for clique in cover for index in clique]
        if sorted(flattened) != list(range(len(adjacent))):
            errors.append("clique_cover_incomplete")
        for clique in cover:
            for offset, left in enumerate(clique):
                if any(right not in adjacent[left] for right in clique[offset + 1:]):
                    errors.append("invalid_clique_edge")
    if len(selected) != len(cover) or certificate.get("optimum") != len(selected):
        errors.append("upper_lower_bound_mismatch")
    statement = {key: value for key, value in certificate.items() if key not in ("sha256", "canonicalPayload")}
    try:
        payload_matches = json.loads(certificate.get("canonicalPayload", "null")) == statement
    except json.JSONDecodeError:
        payload_matches = False
    if not payload_matches or certificate.get("sha256") != sha256(certificate.get("canonicalPayload", "")):
        errors.append("certificate_digest_mismatch")
    return list(dict.fromkeys(errors))


def main():
    if len(sys.argv) != 2:
        print("Usage: verify_finite_domain.py certificate.json", file=sys.stderr)
        return 2
    certificate = json.loads(Path(sys.argv[1]).read_text())
    errors = verify_certificate(certificate)
    print(json.dumps({
        "format": "tpa-finite-domain-cross-verification/v1",
        "implementation": "python-stdlib-independent",
        "valid": not errors,
        "candidateCount": len((certificate.get("domain") or {}).get("candidates") or []),
        "optimum": certificate.get("optimum") if not errors else None,
        "globallyOptimal": False,
        "errors": errors,
    }, indent=2))
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
