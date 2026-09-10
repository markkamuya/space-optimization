import { bounds, vertices } from '../geometry/triangle.js';
import { placedTriangles } from '../solvers/scoring.js';

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function workshopFocusViewport(problem, triangle, aspectRatio = 1.6) {
  const triangleBounds = bounds(triangle);
  const triangleWidth = Math.max(1e-6, triangleBounds.maxX - triangleBounds.minX);
  const triangleHeight = Math.max(1e-6, triangleBounds.maxY - triangleBounds.minY);
  const width = Math.min(problem.width, Math.max(triangleWidth * 4, triangleHeight * 4 * aspectRatio, problem.width / 8));
  const height = Math.min(problem.height, Math.max(triangleHeight * 4, triangleWidth * 4 / aspectRatio, width / aspectRatio));
  const centerX = (triangleBounds.minX + triangleBounds.maxX) / 2;
  const centerY = (triangleBounds.minY + triangleBounds.maxY) / 2;
  const minX = clamp(centerX - width / 2, 0, Math.max(0, problem.width - width));
  const minY = clamp(centerY - height / 2, 0, Math.max(0, problem.height - height));
  return { minX, minY, maxX: minX + width, maxY: minY + height, width, height };
}

function intersects(left, right) {
  return left.maxX >= right.minX && left.minX <= right.maxX && left.maxY >= right.minY && left.minY <= right.maxY;
}

export function renderWorkshopFocusLens(canvas, problem, state, selectedIndex) {
  const placed = placedTriangles(problem, state);
  const selected = placed[selectedIndex];
  if (!selected) return null;
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(rect.width * ratio));
  canvas.height = Math.max(1, Math.round(rect.height * ratio));
  const context = canvas.getContext('2d');
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, rect.width, rect.height);
  const padding = 18;
  const viewport = workshopFocusViewport(problem, selected.placed, (rect.width - padding * 2) / Math.max(1, rect.height - padding * 2));
  const scale = Math.min((rect.width - padding * 2) / viewport.width, (rect.height - padding * 2) / viewport.height);
  const originX = (rect.width - viewport.width * scale) / 2 - viewport.minX * scale;
  const originY = (rect.height - viewport.height * scale) / 2 - viewport.minY * scale;
  context.save();
  context.beginPath();
  context.rect(padding, padding, rect.width - padding * 2, rect.height - padding * 2);
  context.clip();
  context.fillStyle = '#fffdf7';
  context.fillRect(originX, originY, problem.width * scale, problem.height * scale);
  context.strokeStyle = '#1d2019';
  context.lineWidth = 2;
  context.strokeRect(originX, originY, problem.width * scale, problem.height * scale);
  context.setLineDash([4, 4]);
  context.strokeStyle = '#7b827c';
  context.strokeRect(originX + problem.margin * scale, originY + problem.margin * scale, (problem.width - problem.margin * 2) * scale, (problem.height - problem.margin * 2) * scale);
  context.setLineDash([]);
  let nearbyCount = 0;
  for (const [index, item] of placed.entries()) {
    if (!intersects(bounds(item.placed), viewport)) continue;
    nearbyCount += 1;
    const points = vertices(item.placed).map(point => ({ x: originX + point.x * scale, y: originY + point.y * scale }));
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) context.lineTo(point.x, point.y);
    context.closePath();
    context.fillStyle = `${item.color}cc`;
    context.fill();
    context.strokeStyle = index === selectedIndex ? '#b42f18' : '#39413d';
    context.lineWidth = index === selectedIndex ? 4 : 1;
    context.stroke();
  }
  context.restore();
  context.strokeStyle = '#1d2019';
  context.lineWidth = 1;
  context.strokeRect(padding, padding, rect.width - padding * 2, rect.height - padding * 2);
  return { viewport, nearbyCount };
}
