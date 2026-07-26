function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function rounded(value) {
  return Math.round(value * 1e9) / 1e9;
}

export function canonicalPacking(problem, state) {
  return {
    container: [rounded(problem.width), rounded(problem.height)],
    margin: rounded(problem.margin),
    spacing: rounded(problem.kerf),
    triangles: problem.triangles.map((triangle, index) => ({
      sides: [...triangle.sides].sort((a, b) => a - b).map(rounded),
      placement: {
        x: rounded(state[index].x),
        y: rounded(state[index].y),
        angle: rounded(((state[index].angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)),
        reflect: Boolean(state[index].reflect)
      }
    })).sort((left, right) => stable(left).localeCompare(stable(right)))
  };
}

export function packingFingerprint(problem, state) {
  const input = stable(canonicalPacking(problem, state));
  let hash = 0xcbf29ce484222325n;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= BigInt(input.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return `tpa1-${hash.toString(16).padStart(16, '0')}`;
}
