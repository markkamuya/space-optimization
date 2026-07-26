import { placedTriangles } from '../solvers/scoring.js';
import { vertices } from '../geometry/triangle.js';

function setup(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(rect.width * ratio));
  canvas.height = Math.max(1, Math.round(rect.height * ratio));
  const context = canvas.getContext('2d');
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { context, width: rect.width, height: rect.height };
}

export function renderPacking(canvas, problem, result) {
  const { context, width, height } = setup(canvas);
  context.clearRect(0, 0, width, height);
  const padding = 24;
  const scale = Math.min((width - padding * 2) / problem.width, (height - padding * 2) / problem.height);
  const originX = (width - problem.width * scale) / 2;
  const originY = (height - problem.height * scale) / 2;

  context.fillStyle = '#f9f8f3';
  context.strokeStyle = '#1d2019';
  context.lineWidth = 1;
  context.fillRect(originX, originY, problem.width * scale, problem.height * scale);
  context.strokeRect(originX, originY, problem.width * scale, problem.height * scale);
  context.setLineDash([3, 4]);
  context.strokeStyle = '#a4a89e';
  context.strokeRect(
    originX + problem.margin * scale,
    originY + problem.margin * scale,
    (problem.width - problem.margin * 2) * scale,
    (problem.height - problem.margin * 2) * scale
  );
  context.setLineDash([]);

  const showLabels = result.showLabels ?? result.state.length <= 48;
  for (const item of placedTriangles(problem, result.state)) {
    const points = vertices(item.placed).map(point => ({
      x: originX + point.x * scale,
      y: originY + point.y * scale
    }));
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach(point => context.lineTo(point.x, point.y));
    context.closePath();
    context.fillStyle = `${item.color}cc`;
    context.fill();
    context.strokeStyle = '#161812';
    context.stroke();
    if (showLabels) {
      const center = points.reduce((acc, point) => ({ x: acc.x + point.x / 3, y: acc.y + point.y / 3 }), { x: 0, y: 0 });
      context.fillStyle = '#161812';
      context.font = '500 10px DM Mono';
      context.textAlign = 'center';
      context.fillText(item.id, center.x, center.y + 3);
    }
  }
}

export function renderChart(canvas, history) {
  const { context, width, height } = setup(canvas);
  context.clearRect(0, 0, width, height);
  const padding = { left: 45, right: 20, top: 20, bottom: 30 };
  context.strokeStyle = '#c7c8c0';
  context.lineWidth = 1;
  for (let line = 0; line < 4; line += 1) {
    const y = padding.top + line * (height - padding.top - padding.bottom) / 3;
    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(width - padding.right, y);
    context.stroke();
  }
  if (!history?.length) return;
  const values = history.map(item => Math.log10(Math.max(1, item.score)));
  const min = Math.min(...values);
  const max = Math.max(...values);
  context.beginPath();
  history.forEach((item, index) => {
    const x = padding.left + index / Math.max(1, history.length - 1) * (width - padding.left - padding.right);
    const y = padding.top + (1 - (values[index] - min) / Math.max(1e-9, max - min)) * (height - padding.top - padding.bottom);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.strokeStyle = '#f97316';
  context.lineWidth = 2;
  context.stroke();
  context.fillStyle = '#6f7468';
  context.font = '10px DM Mono';
  context.textAlign = 'left';
  context.fillText('START', padding.left, height - 10);
  context.textAlign = 'right';
  context.fillText('BEST FOUND', width - padding.right, height - 10);
}
