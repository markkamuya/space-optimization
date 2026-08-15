#!/usr/bin/env python3
"""Dependency-free second implementation of the Atlas geometry verifier."""

import json
import math
import sys
from pathlib import Path

EPSILON = 1e-7


def finite_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def validate_record(record):
    if not isinstance(record, dict):
        return ["record_not_object"]
    errors = []
    problem = record.get("problem")
    solution = record.get("solution")
    verification = record.get("verification")
    if not isinstance(record.get("id"), str) or not record["id"]:
        errors.append("invalid_id")
    if not isinstance(problem, dict):
        errors.append("invalid_problem")
        return errors
    for key in ("width", "height"):
        if not finite_number(problem.get(key)) or problem[key] <= 0:
            errors.append(f"invalid_problem_{key}")
    for key in ("margin", "kerf"):
        value = problem.get(key, 0)
        if not finite_number(value) or value < 0:
            errors.append(f"invalid_problem_{key}")
    if (finite_number(problem.get("width")) and finite_number(problem.get("height"))
            and finite_number(problem.get("margin", 0))
            and (problem["width"] <= problem.get("margin", 0) * 2
                 or problem["height"] <= problem.get("margin", 0) * 2)):
        errors.append("margin_eliminates_usable_area")
    for key in ("allowRotation", "allowReflection"):
        if key in problem and not isinstance(problem[key], bool):
            errors.append(f"invalid_problem_{key}")
    pieces = [problem.get("homogeneousPiece")] if problem.get("homogeneousPiece") else problem.get("triangles")
    if not isinstance(pieces, list) or not pieces:
        errors.append("missing_triangle_inventory")
    else:
        for index, piece in enumerate(pieces):
            sides = piece.get("sides") if isinstance(piece, dict) else None
            if (not isinstance(sides, list) or len(sides) != 3
                    or not all(finite_number(side) and side > 0 for side in sides)
                    or any(sides[index] + sides[(index + 1) % 3] <= sides[(index + 2) % 3]
                           for index in range(3))):
                errors.append(f"invalid_triangle_sides:{index}")
    placements = solution.get("placements") if isinstance(solution, dict) else None
    if not isinstance(placements, list):
        errors.append("invalid_placements")
        return errors
    if not problem.get("homogeneousPiece") and isinstance(pieces, list) and len(placements) != len(pieces):
        errors.append("placement_count_mismatch")
    for index, placement in enumerate(placements):
        if not isinstance(placement, dict):
            errors.append(f"invalid_placement:{index}")
            continue
        for key in ("x", "y", "angle"):
            if key not in placement or not finite_number(placement[key]):
                errors.append(f"invalid_placement_{key}:{index}")
        if "reflect" in placement and not isinstance(placement["reflect"], bool):
            errors.append(f"invalid_placement_reflect:{index}")
    if not isinstance(verification, dict):
        errors.append("invalid_verification")
    else:
        if not isinstance(verification.get("fingerprint"), str):
            errors.append("invalid_verification_fingerprint")
        if not finite_number(verification.get("utilization")):
            errors.append("invalid_verification_utilization")
    return errors


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


def point_segment_distance(point, start, end):
    dx, dy = end[0] - start[0], end[1] - start[1]
    length_squared = dx * dx + dy * dy
    if length_squared == 0:
        return math.hypot(point[0] - start[0], point[1] - start[1])
    projection = max(0.0, min(1.0, (
        (point[0] - start[0]) * dx + (point[1] - start[1]) * dy
    ) / length_squared))
    nearest = (start[0] + projection * dx, start[1] + projection * dy)
    return math.hypot(point[0] - nearest[0], point[1] - nearest[1])


def polygon_distance(left, right):
    distances = []
    for source, target in ((left, right), (right, left)):
        for point in source:
            for index in range(3):
                distances.append(point_segment_distance(
                    point, target[index], target[(index + 1) % 3]
                ))
    return min(distances)


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


def stability_certificate(problem, placed, has_geometry_errors):
    margin = problem.get("margin", 0.0)
    kerf = problem.get("kerf", 0.0)
    boundary_slacks = []
    for points in placed:
        xs, ys = [point[0] for point in points], [point[1] for point in points]
        boundary_slacks.extend((min(xs) - margin, problem["width"] - margin - max(xs),
                                min(ys) - margin, problem["height"] - margin - max(ys)))
    pair_clearances = []
    boxes = [(min(point[0] for point in points), min(point[1] for point in points),
              max(point[0] for point in points), max(point[1] for point in points))
             for points in placed]
    minimum_pair = None
    for left in range(len(placed)):
        for right in range(left + 1, len(placed)):
            horizontal = max(0.0, boxes[left][0] - boxes[right][2],
                             boxes[right][0] - boxes[left][2])
            vertical = max(0.0, boxes[left][1] - boxes[right][3],
                           boxes[right][1] - boxes[left][3])
            lower_bound = math.hypot(horizontal, vertical) - kerf
            if minimum_pair is not None and lower_bound >= minimum_pair:
                continue
            clearance = polygon_distance(placed[left], placed[right]) - kerf
            pair_clearances.append(clearance)
            minimum_pair = clearance if minimum_pair is None else min(minimum_pair, clearance)
            if minimum_pair <= -kerf:
                break
        if minimum_pair is not None and minimum_pair <= -kerf:
            break
    minimum_boundary = min(boundary_slacks) if boundary_slacks else None
    if has_geometry_errors:
        classification = "invalid"
    elif ((minimum_boundary is not None and minimum_boundary < -1e-9)
          or (minimum_pair is not None and minimum_pair < -1e-9)):
        classification = "tolerance_dependent"
    elif ((minimum_boundary is not None and minimum_boundary <= 1e-9)
          or (minimum_pair is not None and minimum_pair <= 1e-9)):
        classification = "contact"
    else:
        classification = "robust"
    return classification, minimum_boundary, minimum_pair


def verify(record, verify_stability=True):
    errors = validate_record(record)
    if errors:
        return errors
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
    kerf = problem.get("kerf", 0.0)
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
            boxes_overlap = not (
                left_box[2] <= right_box[0] + 1e-9 or right_box[2] <= left_box[0] + 1e-9
                or left_box[3] <= right_box[1] + 1e-9 or right_box[3] <= left_box[1] + 1e-9
            )
            polygons_overlap = boxes_overlap and overlaps(placed[left], placed[right])
            if polygons_overlap:
                errors.append(f"overlap:{left}:{right}")
            elif kerf > 0 and polygon_distance(placed[left], placed[right]) < kerf - EPSILON:
                errors.append(f"spacing_violation:{left}:{right}")
    usable_area = ((problem["width"] - margin * 2) *
                   (problem["height"] - margin * 2))
    utilization = sum(area(template) for template in templates) / usable_area
    actual_fingerprint = fingerprint(record)
    if actual_fingerprint != record["verification"]["fingerprint"]:
        errors.append("fingerprint_mismatch")
    if abs(utilization - record["verification"]["utilization"]) > EPSILON:
        errors.append("utilization_mismatch")
    stored_stability = record["verification"].get("stability")
    if stored_stability is not None and verify_stability:
        geometry_errors = any(error.startswith(("out_of_bounds", "overlap", "spacing_violation"))
                              for error in errors)
        classification, boundary, pair = stability_certificate(problem, placed, geometry_errors)
        if stored_stability.get("format") != "triangle-packing-stability/v1":
            errors.append("stability_format_mismatch")
        if stored_stability.get("classification") != classification:
            errors.append("stability_classification_mismatch")
        for key, actual in (("minimumBoundarySlack", boundary), ("minimumPairClearance", pair)):
            expected = stored_stability.get(key)
            if ((expected is None) != (actual is None)
                    or (actual is not None and abs(expected - actual) > 1e-9)):
                errors.append(f"stability_margin_mismatch:{key}")
    return errors


def main():
    source = Path(sys.argv[1] if len(sys.argv) > 1 else "public/atlas-research-v2.json")
    release = json.loads(source.read_text())
    failures = []
    for record in release["records"]:
        try:
            errors = verify(record)
        except (IndexError, KeyError, OverflowError, TypeError, ValueError) as error:
            errors = [f"verifier_exception:{type(error).__name__}"]
        if errors:
            record_id = record.get("id", "<missing>") if isinstance(record, dict) else "<invalid>"
            failures.append({"id": record_id, "errors": errors[:10]})
    report = {
        "format": "triangle-packing-cross-verification/v1",
        "implementation": "python-stdlib-independent",
        "records": len(release["records"]),
        "passed": len(release["records"]) - len(failures),
        "stabilityCertificates": sum(
            isinstance(record.get("verification", {}).get("stability"), dict)
            for record in release["records"] if isinstance(record, dict)
        ),
        "failures": failures,
    }
    print(json.dumps(report, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
