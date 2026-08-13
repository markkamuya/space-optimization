function pieceSignature(triangle) {
  return [...triangle.sides]
    .sort((a, b) => a - b)
    .map(value => Number(value.toFixed(9)))
    .join(',');
}

export function packingProblemIdentity(problem) {
  const counts = new Map();
  for (const triangle of problem.triangles) {
    const signature = pieceSignature(triangle);
    counts.set(signature, (counts.get(signature) ?? 0) + 1);
  }
  const homogeneous = counts.size === 1;
  const inventory = [...counts]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([signature, count]) => ({ signature, count: homogeneous ? 'variable' : count }));
  return JSON.stringify({
    width: Number(problem.width.toFixed(9)),
    height: Number(problem.height.toFixed(9)),
    margin: Number((problem.margin ?? 0).toFixed(9)),
    kerf: Number((problem.kerf ?? 0).toFixed(9)),
    allowRotation: problem.allowRotation ?? true,
    allowReflection: problem.allowReflection ?? false,
    fillSheet: problem.fillSheet ?? false,
    inventory
  });
}
