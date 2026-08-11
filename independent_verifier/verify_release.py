#!/usr/bin/env python3
"""Dependency-free second implementation of the Atlas geometry verifier."""

import json
import math
import sys
from pathlib import Path

EPSILON = 1e-7


def triangle_from_sides(a, b, c):
    x = (b * b + c * c - a * a) / (2 * c)
    height = math.sqrt(max(0.0, b * b - x * x))
    return ((0.0, 0.0), (c, 0.0), (x, height))


def transform(points, placement):
    angle = placement.get("angle", 0.0)
    cosine, sine = math.cos(angle), math.sin(angle)
    reflect = placement.get("reflect", False)
    result = []
    for x, y in points:
        local_x = -x if reflect else x
        result.append((
            local_x * cosine - y * sine + placement["x"],
            local_x * sine + y * cosine + placement["y"],
        ))
    return tuple(result)


def area(points):
    return abs(sum(
        points[index][0] * points[(index + 1) % 3][1]
        - points[(index + 1) % 3][0] * points[index][1]
        for index in range(3)
    )) / 2


def projections(points, axis):
    values = [x * axis[0] + y * axis[1] for x, y in points]
    return min(values), max(values)


def overlaps(left, right):
    for polygon in (left, right):
        for index in range(3):
            start, end = polygon[index], polygon[(index + 1) % 3]
            dx, dy = end[0] - start[0], end[1] - start[1]
            length = math.hypot(dx, dy)
            axis = (-dy / length, dx / length)
            a_min, a_max = projections(left, axis)
            b_min, b_max = projections(right, axis)
            if min(a_max, b_max) - max(a_min, b_min) <= 1e-9:
                return False
    return True


def rounded(value):
    result = round(value * 1_000_000_000) / 1_000_000_000
    return 0 if result == 0 else result


def js_number(value):
    if isinstance(value, int) or float(value).is_integer():
        return str(int(value))
    return repr(float(value))


def stable(value):
    if isinstance(value, list):
        return "[" + ",".join(stable(item) for item in value) + "]"
    if isinstance(value, dict):
        return "{" + ",".join(
            json.dumps(key, ensure_ascii=False, separators=(",", ":")) + ":" + stable(value[key])
            for key in sorted(value)
        ) + "}"
    if isinstance(value, bool):
        return "true" if value else "false"
    if value is None:
        return "null"
    if isinstance(value, (int, float)):
        return js_number(value)
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def fingerprint(record):
    problem, placements = record["problem"], record["solution"]["placements"]
    triangles = [{
        "sides": sorted(rounded(value) for value in (
            problem.get("homogeneousPiece") or problem["triangles"][index]
        )["sides"]),
        "placement": {
            "x": rounded(placement["x"]),
            "y": rounded(placement["y"]),
            "angle": rounded(placement.get("angle", 0.0) % (math.pi * 2)),
            "reflect": bool(placement.get("reflect", False)),
        },
    } for index, placement in enumerate(placements)]
    triangles.sort(key=stable)
    canonical = {
        "container": [rounded(problem["width"]), rounded(problem["height"])],
        "margin": rounded(problem.get("margin", 0)),
        "spacing": rounded(problem.get("kerf", 0)),
        "triangles": triangles,
    }
    encoded = stable(canonical)
    value = 0xCBF29CE484222325
    for character in encoded:
        value ^= ord(character)
        value = (value * 0x100000001B3) & 0xFFFFFFFFFFFFFFFF
    return f"tpa1-{value:016x}"


def verify(record):
    problem = record["problem"]
    placements = record["solution"]["placements"]
    pieces = [
        problem.get("homogeneousPiece") or problem["triangles"][index]
        for index in range(len(placements))
    ]
    templates = [triangle_from_sides(*piece["sides"]) for piece in pieces]
    placed = [transform(template, placement) for template, placement in zip(templates, placements)]
    errors = []
    margin = problem.get("margin", 0.0)
    allow_rotation = problem.get("allowRotation", True)
    allow_reflection = problem.get("allowReflection", False)
    for index, placement in enumerate(placements):
        if not allow_rotation and abs(placement.get("angle", 0.0)) > 1e-9:
            errors.append(f"rotation_not_allowed:{index}")
        if not allow_reflection and placement.get("reflect", False):
            errors.append(f"reflection_not_allowed:{index}")
    for index, points in enumerate(placed):
        for x, y in points:
            if (x < margin - EPSILON or y < margin - EPSILON
                    or x > problem["width"] - margin + EPSILON
                    or y > problem["height"] - margin + EPSILON):
                errors.append(f"out_of_bounds:{index}")
                break
    for left in range(len(placed)):
        left_box = (
            min(point[0] for point in placed[left]), min(point[1] for point in placed[left]),
            max(point[0] for point in placed[left]), max(point[1] for point in placed[left]),
        )
        for right in range(left + 1, len(placed)):
            right_box = (
                min(point[0] for point in placed[right]), min(point[1] for point in placed[right]),
                max(point[0] for point in placed[right]), max(point[1] for point in placed[right]),
            )
            if left_box[2] <= right_box[0] + 1e-9 or right_box[2] <= left_box[0] + 1e-9:
                continue
            if left_box[3] <= right_box[1] + 1e-9 or right_box[3] <= left_box[1] + 1e-9:
                continue
            if overlaps(placed[left], placed[right]):
                errors.append(f"overlap:{left}:{right}")
    utilization = sum(area(template) for template in templates) / (problem["width"] * problem["height"])
    actual_fingerprint = fingerprint(record)
    if actual_fingerprint != record["verification"]["fingerprint"]:
        errors.append("fingerprint_mismatch")
    if abs(utilization - record["verification"]["utilization"]) > EPSILON:
        errors.append("utilization_mismatch")
    return errors


def main():
    source = Path(sys.argv[1] if len(sys.argv) > 1 else "public/atlas-research-v2.json")
    release = json.loads(source.read_text())
    failures = []
    for record in release["records"]:
        errors = verify(record)
        if errors:
            failures.append({"id": record["id"], "errors": errors[:10]})
    report = {
        "format": "triangle-packing-cross-verification/v1",
        "implementation": "python-stdlib-independent",
        "records": len(release["records"]),
        "passed": len(release["records"]) - len(failures),
        "failures": failures,
    }
    print(json.dumps(report, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
