import { placedTriangles } from '../solvers/scoring.js';
import { serializableProblem } from './problem.js';
import { vertices } from '../geometry/triangle.js';

function download(name, type, content) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportJSON(problem, result) {
  download('forma-packing.json', 'application/json', JSON.stringify({
    format: 'forma-packing/v1',
    problem: serializableProblem(problem),
    solution: {
      solver: result.solver,
      state: result.state,
      metrics: result.metrics
    }
  }, null, 2));
}

export function exportSVG(problem, result) {
  const polygons = placedTriangles(problem, result.state).map(item => {
    const points = vertices(item.placed).map(point => `${point.x},${point.y}`).join(' ');
    return `<polygon points="${points}" fill="${item.color}" fill-opacity=".8" stroke="#111" stroke-width=".04"><title>Triangle ${item.id}</title></polygon>`;
  }).join('\n  ');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${problem.width} ${problem.height}" width="${problem.width}" height="${problem.height}">
  <rect width="${problem.width}" height="${problem.height}" fill="white" stroke="#111" stroke-width=".05"/>
  ${polygons}
</svg>`;
  download('forma-packing.svg', 'image/svg+xml', svg);
}

export function exportDXF(problem, result) {
  const entities = placedTriangles(problem, result.state).map(item => {
    const points = vertices(item.placed);
    const closed = [...points, points[0]];
    return closed.slice(0, -1).map((point, index) => {
      const next = closed[index + 1];
      return `0\nLINE\n8\nTRIANGLES\n10\n${point.x}\n20\n${point.y}\n30\n0\n11\n${next.x}\n21\n${next.y}\n31\n0`;
    }).join('\n');
  }).join('\n');
  download('forma-packing.dxf', 'application/dxf', `0\nSECTION\n2\nENTITIES\n${entities}\n0\nENDSEC\n0\nEOF`);
}
