export const DEFAULT_EPSILON = 1e-9;

function assertFinite(name, value) {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
}

function assertPositive(name, value, epsilon) {
  assertFinite(name, value);
  if (value <= epsilon) {
    throw new RangeError(`${name} must be greater than zero`);
  }
}

export function point(x, y) {
  assertFinite('x', x);
  assertFinite('y', y);
  return Object.freeze({ x, y });
}

export function triangle(a, b, c, epsilon = DEFAULT_EPSILON) {
  const result = Object.freeze({ a: point(a.x, a.y), b: point(b.x, b.y), c: point(c.x, c.y) });
  if (area(result) <= epsilon) {
    throw new RangeError('Triangle vertices must not be collinear');
  }
  return result;
}

export function signedDoubleArea(value) {
  return (
    value.a.x * (value.b.y - value.c.y) +
    value.b.x * (value.c.y - value.a.y) +
    value.c.x * (value.a.y - value.b.y)
  );
}

export function area(value) {
  return Math.abs(signedDoubleArea(value)) / 2;
}

export function sideLengths(value) {
  return {
    a: Math.hypot(value.b.x - value.c.x, value.b.y - value.c.y),
    b: Math.hypot(value.a.x - value.c.x, value.a.y - value.c.y),
    c: Math.hypot(value.a.x - value.b.x, value.a.y - value.b.y)
  };
}

export function fromSSS(a, b, c, epsilon = DEFAULT_EPSILON) {
  assertPositive('a', a, epsilon);
  assertPositive('b', b, epsilon);
  assertPositive('c', c, epsilon);
  if (a + b <= c + epsilon || a + c <= b + epsilon || b + c <= a + epsilon) {
    throw new RangeError('Side lengths must satisfy the triangle inequality');
  }

  const cPoint = point((b * b + c * c - a * a) / (2 * c), 0);
  const heightSquared = b * b - cPoint.x * cPoint.x;
  if (heightSquared <= epsilon * epsilon) {
    throw new RangeError('Side lengths produce a degenerate triangle');
  }
  return triangle(point(0, 0), point(c, 0), point(cPoint.x, Math.sqrt(heightSquared)), epsilon);
}

export function fromSAS(sideA, includedAngleDegrees, sideB, epsilon = DEFAULT_EPSILON) {
  assertPositive('sideA', sideA, epsilon);
  assertPositive('sideB', sideB, epsilon);
  assertFinite('includedAngleDegrees', includedAngleDegrees);
  if (includedAngleDegrees <= 0 || includedAngleDegrees >= 180) {
    throw new RangeError('Included angle must be between 0 and 180 degrees');
  }

  const angle = includedAngleDegrees * Math.PI / 180;
  return triangle(
    point(0, 0),
    point(sideA, 0),
    point(sideB * Math.cos(angle), sideB * Math.sin(angle)),
    epsilon
  );
}

export function fromAAS(angleA, angleB, sideAB, epsilon = DEFAULT_EPSILON) {
  assertFinite('angleA', angleA);
  assertFinite('angleB', angleB);
  assertPositive('sideAB', sideAB, epsilon);
  const angleC = 180 - angleA - angleB;
  if (angleA <= 0 || angleB <= 0 || angleC <= 0) {
    throw new RangeError('Triangle angles must be positive and sum to 180 degrees');
  }

  const aRadians = angleA * Math.PI / 180;
  const bRadians = angleB * Math.PI / 180;
  const cRadians = angleC * Math.PI / 180;
  const sideAC = sideAB * Math.sin(bRadians) / Math.sin(cRadians);
  return triangle(
    point(0, 0),
    point(sideAB, 0),
    point(sideAC * Math.cos(aRadians), sideAC * Math.sin(aRadians)),
    epsilon
  );
}

export function transform(value, { x = 0, y = 0, angle = 0, reflect = false } = {}) {
  assertFinite('x', x);
  assertFinite('y', y);
  assertFinite('angle', angle);
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const move = current => {
    const localX = reflect ? -current.x : current.x;
    return point(
      localX * cosine - current.y * sine + x,
      localX * sine + current.y * cosine + y
    );
  };
  return triangle(move(value.a), move(value.b), move(value.c));
}

export function vertices(value) {
  return [value.a, value.b, value.c];
}

export function isInsideBounds(value, bounds, epsilon = DEFAULT_EPSILON) {
  return vertices(value).every(current =>
    current.x >= bounds.minX - epsilon &&
    current.x <= bounds.maxX + epsilon &&
    current.y >= bounds.minY - epsilon &&
    current.y <= bounds.maxY + epsilon
  );
}

export function bounds(value) {
  const points = vertices(value);
  return {
    minX: Math.min(...points.map(current => current.x)),
    minY: Math.min(...points.map(current => current.y)),
    maxX: Math.max(...points.map(current => current.x)),
    maxY: Math.max(...points.map(current => current.y))
  };
}

function axes(value) {
  const points = vertices(value);
  return points.map((current, index) => {
    const next = points[(index + 1) % points.length];
    const dx = next.x - current.x;
    const dy = next.y - current.y;
    const length = Math.hypot(dx, dy);
    return { x: -dy / length, y: dx / length };
  });
}

function projection(value, axis) {
  const products = vertices(value).map(current => current.x * axis.x + current.y * axis.y);
  return { min: Math.min(...products), max: Math.max(...products) };
}

export function overlaps(left, right, epsilon = DEFAULT_EPSILON) {
  for (const axis of [...axes(left), ...axes(right)]) {
    const a = projection(left, axis);
    const b = projection(right, axis);
    const penetration = Math.min(a.max, b.max) - Math.max(a.min, b.min);
    if (penetration <= epsilon) {
      return false;
    }
  }
  return true;
}

function insideClipEdge(subject, start, end, orientation, epsilon) {
  const cross = (end.x - start.x) * (subject.y - start.y) -
    (end.y - start.y) * (subject.x - start.x);
  return orientation * cross >= -epsilon;
}

function lineIntersection(a, b, c, d) {
  const denominator = (a.x - b.x) * (c.y - d.y) - (a.y - b.y) * (c.x - d.x);
  if (Math.abs(denominator) <= DEFAULT_EPSILON) return b;
  const determinantA = a.x * b.y - a.y * b.x;
  const determinantB = c.x * d.y - c.y * d.x;
  return point(
    (determinantA * (c.x - d.x) - (a.x - b.x) * determinantB) / denominator,
    (determinantA * (c.y - d.y) - (a.y - b.y) * determinantB) / denominator
  );
}

export function intersectionPolygon(left, right, epsilon = DEFAULT_EPSILON) {
  let output = vertices(left);
  const clip = vertices(right);
  const orientation = Math.sign(signedDoubleArea(right)) || 1;

  for (let index = 0; index < clip.length; index += 1) {
    const clipStart = clip[index];
    const clipEnd = clip[(index + 1) % clip.length];
    const input = output;
    output = [];
    if (input.length === 0) break;

    let previous = input[input.length - 1];
    for (const current of input) {
      const currentInside = insideClipEdge(current, clipStart, clipEnd, orientation, epsilon);
      const previousInside = insideClipEdge(previous, clipStart, clipEnd, orientation, epsilon);
      if (currentInside) {
        if (!previousInside) output.push(lineIntersection(previous, current, clipStart, clipEnd));
        output.push(current);
      } else if (previousInside) {
        output.push(lineIntersection(previous, current, clipStart, clipEnd));
      }
      previous = current;
    }
  }
  return output;
}

export function polygonArea(points) {
  if (points.length < 3) return 0;
  let total = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    total += current.x * next.y - current.y * next.x;
  }
  return Math.abs(total) / 2;
}

export function overlapArea(left, right, epsilon = DEFAULT_EPSILON) {
  if (!overlaps(left, right, epsilon)) return 0;
  return polygonArea(intersectionPolygon(left, right, epsilon));
}

export function boundaryOverflow(value, container) {
  const result = bounds(value);
  return (
    Math.max(0, container.minX - result.minX) +
    Math.max(0, result.maxX - container.maxX) +
    Math.max(0, container.minY - result.minY) +
    Math.max(0, result.maxY - container.maxY)
  );
}

function pointSegmentDistance(subject, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(subject.x - start.x, subject.y - start.y);
  const position = Math.max(0, Math.min(1, (
    (subject.x - start.x) * dx + (subject.y - start.y) * dy
  ) / lengthSquared));
  return Math.hypot(subject.x - (start.x + position * dx), subject.y - (start.y + position * dy));
}

export function polygonDistance(left, right, epsilon = DEFAULT_EPSILON) {
  if (overlaps(left, right, epsilon)) return 0;
  const leftPoints = vertices(left);
  const rightPoints = vertices(right);
  let minimum = Infinity;
  for (let index = 0; index < leftPoints.length; index += 1) {
    const start = leftPoints[index];
    const end = leftPoints[(index + 1) % leftPoints.length];
    for (const subject of rightPoints) {
      minimum = Math.min(minimum, pointSegmentDistance(subject, start, end));
    }
  }
  for (let index = 0; index < rightPoints.length; index += 1) {
    const start = rightPoints[index];
    const end = rightPoints[(index + 1) % rightPoints.length];
    for (const subject of leftPoints) {
      minimum = Math.min(minimum, pointSegmentDistance(subject, start, end));
    }
  }
  return minimum;
}
