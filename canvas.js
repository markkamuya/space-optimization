const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const coordsDisplay = document.getElementById('coords');
const drawModeBtn = document.getElementById('drawModeBtn');
const arrowToggleBtn = document.getElementById('arrowToggleBtn');
const colorPicker = document.getElementById('colorPicker');
const contextMenu = document.getElementById('contextMenu');
const deleteLineBtn = document.getElementById('deleteLineBtn');

let scale = 40;
let offsetX = canvas.width / 2;
let offsetY = canvas.height / 2;

let lines = [];
let isArrowMode = false;
let isDrawing = false;
let drawStart = null;
let tempMousePos = null;
let selectedLine = null;
let dragInfo = null;
let isPanning = false;
let panStart = null;
const UNDO_STACK = [];

class Line {
  constructor(x1, y1, x2, y2, color = '#008000') {
    this.x1 = x1; this.y1 = y1;
    this.x2 = x2; this.y2 = y2;
    this.color = color;
    this.isArrow = false;
  }
  draw(ctx, toCanvasCoords, highlight = false) {
    const [cx1, cy1] = toCanvasCoords(this.x1, this.y1);
    const [cx2, cy2] = toCanvasCoords(this.x2, this.y2);
    ctx.lineWidth = highlight ? 4 : 2;
    ctx.strokeStyle = highlight ? '#4CAF50' : this.color;
    ctx.beginPath(); ctx.moveTo(cx1, cy1); ctx.lineTo(cx2, cy2); ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath(); ctx.arc(cx1, cy1, 6, 0, 2 * Math.PI); ctx.fill();
    ctx.beginPath(); ctx.arc(cx2, cy2, 6, 0, 2 * Math.PI); ctx.fill();
  }
  clone() {
    const c = new Line(this.x1, this.y1, this.x2, this.y2, this.color);
    c.isArrow = this.isArrow;
    return c;
  }
}

class ArrowLine extends Line {
  constructor(...args) {
    super(...args);
    this.isArrow = true;
  }
  draw(ctx, toCanvasCoords, highlight = false) {
    const [cx1, cy1] = toCanvasCoords(this.x1, this.y1);
    const [cx2, cy2] = toCanvasCoords(this.x2, this.y2);
    ctx.lineWidth = highlight ? 4 : 2;
    ctx.strokeStyle = highlight ? '#4CAF50' : this.color;
    ctx.beginPath();
    ctx.moveTo(cx1, cy1);
    ctx.lineTo(cx2, cy2);
    ctx.stroke();

    // Draw arrowhead only (no circle at end)
    const angle = Math.atan2(cy2 - cy1, cx2 - cx1);
    const size = 15;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.moveTo(cx2, cy2);
    ctx.lineTo(cx2 - size * Math.cos(angle - Math.PI / 6), cy2 - size * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(cx2 - size * Math.cos(angle + Math.PI / 6), cy2 - size * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  }
}


function toCanvasCoords(x, y) {
  return [offsetX + x * scale, offsetY - y * scale];
}
function toCartesianCoords(cx, cy) {
  return [(cx - offsetX) / scale, (offsetY - cy) / scale];
}

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  for (const line of lines) line.draw(ctx, toCanvasCoords, line === selectedLine);
  if (isDrawing && drawStart && tempMousePos) {
    const color = colorPicker.value;
    const tmp = isArrowMode ?
      new ArrowLine(drawStart.x, drawStart.y, tempMousePos.x, tempMousePos.y, color) :
      new Line(drawStart.x, drawStart.y, tempMousePos.x, tempMousePos.y, color);
    tmp.draw(ctx, toCanvasCoords, true);
  }
}

function drawGrid() {
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 1;
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#444';

  const left = -offsetX / scale;
  const right = (canvas.width - offsetX) / scale;
  const top = offsetY / scale;
  const bottom = -(canvas.height - offsetY) / scale;

  for (let x = Math.floor(left); x <= right; x++) {
    const [cx] = toCanvasCoords(x, 0);
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, canvas.height); ctx.stroke();
    if (x !== 0) ctx.fillText(x, cx + 2, offsetY + 14);
  }

  for (let y = Math.floor(bottom); y <= top; y++) {
    const [, cy] = toCanvasCoords(0, y);
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(canvas.width, cy); ctx.stroke();
    if (y !== 0) ctx.fillText(y, offsetX + 4, cy - 4);
  }

  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, offsetY); ctx.lineTo(canvas.width, offsetY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(offsetX, 0); ctx.lineTo(offsetX, canvas.height); ctx.stroke();
}

function findLineAt(x, y) {
  const tolerance = 0.15;
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i];
    const dx = l.x2 - l.x1, dy = l.y2 - l.y1;
    const lenSq = dx * dx + dy * dy;
    let t = ((x - l.x1) * dx + (y - l.y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const px = l.x1 + t * dx, py = l.y1 + t * dy;
    const dist = Math.hypot(px - x, py - y);
    if (dist < tolerance) return l;
  }
  return null;
}

function isNearEndpoint(x, y, line) {
  const d1 = Math.hypot(line.x1 - x, line.y1 - y);
  const d2 = Math.hypot(line.x2 - x, line.y2 - y);
  if (d1 < 0.2) return 'start';
  if (d2 < 0.2) return 'end';
  return null;
}

function pushUndo() {
  UNDO_STACK.push(lines.map(l => l.clone()));
}

function undo() {
  if (UNDO_STACK.length > 0) {
    lines = UNDO_STACK.pop();
    selectedLine = null;
    redraw();
  }
}

// --- Mouse Events ---
canvas.addEventListener('mousedown', (evt) => {
  if (evt.button === 1 || evt.button === 2) {
    isPanning = true;
    panStart = { x: evt.clientX, y: evt.clientY, offsetX, offsetY };
    return;
  }

  const [x, y] = toCartesianCoords(evt.offsetX, evt.offsetY);
  drawStart = { x, y };
  selectedLine = findLineAt(x, y);
  if (selectedLine) {
    dragInfo = {
      type: isNearEndpoint(x, y, selectedLine) || 'move',
      startX: x,
      startY: y,
      orig: selectedLine.clone()
    };
  } else if (drawModeBtn.classList.contains('active')) {
    isDrawing = true;
    tempMousePos = { x, y };
  }
  redraw();
});
const coordTooltip = document.getElementById('coordTooltip');

canvas.addEventListener('mousemove', (evt) => {
  const [x, y] = toCartesianCoords(evt.offsetX, evt.offsetY);

  // Show and position tooltip
  coordTooltip.style.display = 'block';
  coordTooltip.textContent = `(${x.toFixed(2)}, ${y.toFixed(2)})`;

  // Position top-right of pointer (offset by 10px right, 10px up)
  const tooltipX = evt.clientX + 4;
  const tooltipY = y >= 0 ? evt.clientY - 6 : evt.clientY + 6;
  coordTooltip.style.left = tooltipX + 'px';
  coordTooltip.style.top = tooltipY + 'px';

  if (isPanning && panStart) {
    offsetX = panStart.offsetX + (evt.clientX - panStart.x);
    offsetY = panStart.offsetY + (evt.clientY - panStart.y);
    redraw();
    return;
  }

  if (drawModeBtn.classList.contains('active')) {
  canvas.style.cursor = 'crosshair';
} else {
  const hoverLine = findLineAt(x, y);
  if (hoverLine) {
    const endpoint = isNearEndpoint(x, y, hoverLine);
    canvas.style.cursor =
      endpoint === 'start' ? 'nwse-resize' :
      endpoint === 'end' ? 'nesw-resize' :
      'move';
  } else {
    canvas.style.cursor = 'grab';
  }
}


  if (isDrawing && tempMousePos) {
    tempMousePos = { x, y };
    redraw();
  }

  if (dragInfo && selectedLine) {
    const dx = x - dragInfo.startX;
    const dy = y - dragInfo.startY;
    if (dragInfo.type === 'move') {
      selectedLine.x1 = dragInfo.orig.x1 + dx;
      selectedLine.y1 = dragInfo.orig.y1 + dy;
      selectedLine.x2 = dragInfo.orig.x2 + dx;
      selectedLine.y2 = dragInfo.orig.y2 + dy;
    } else if (dragInfo.type === 'start') {
      selectedLine.x1 = x; selectedLine.y1 = y;
    } else if (dragInfo.type === 'end') {
      selectedLine.x2 = x; selectedLine.y2 = y;
    }
    redraw();
  }
  canvas.addEventListener('mouseleave', () => {
  coordTooltip.style.display = 'none';
});
});

canvas.addEventListener('mouseup', () => {
  if (isDrawing && drawStart && tempMousePos) {
    pushUndo();
    const color = colorPicker.value;
    const newLine = isArrowMode ?
      new ArrowLine(drawStart.x, drawStart.y, tempMousePos.x, tempMousePos.y, color) :
      new Line(drawStart.x, drawStart.y, tempMousePos.x, tempMousePos.y, color);
    lines.push(newLine);
    isDrawing = false; drawStart = null; tempMousePos = null;
  }
  if (dragInfo) pushUndo();
  dragInfo = null;
  isPanning = false;
  panStart = null;
  redraw();
});

// Touch
canvas.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) {
    isPanning = true;
    const touch = e.touches[0];
    panStart = { x: touch.clientX, y: touch.clientY, offsetX, offsetY };
  }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  if (isPanning && panStart && e.touches.length === 1) {
    const touch = e.touches[0];
    offsetX = panStart.offsetX + (touch.clientX - panStart.x);
    offsetY = panStart.offsetY + (touch.clientY - panStart.y);
    redraw();
  }
}, { passive: false });

canvas.addEventListener('touchend', () => {
  isPanning = false;
  panStart = null;
});

drawModeBtn.addEventListener('click', () => {
  drawModeBtn.classList.toggle('active');
});

arrowToggleBtn.addEventListener('click', () => {
  isArrowMode = !isArrowMode;
  arrowToggleBtn.textContent = `Arrow Lines: ${isArrowMode ? 'ON' : 'OFF'}`;
});

canvas.addEventListener('contextmenu', (evt) => {
  evt.preventDefault();
  const [x, y] = toCartesianCoords(evt.offsetX, evt.offsetY);
  const hit = findLineAt(x, y);
  if (hit) {
    selectedLine = hit;
    redraw();
    contextMenu.style.left = evt.clientX + 'px';
    contextMenu.style.top = evt.clientY + 'px';
    contextMenu.style.display = 'block';
  } else {
    contextMenu.style.display = 'none';
  }
});

deleteLineBtn.addEventListener('click', () => {
  if (selectedLine) {
    pushUndo();
    lines = lines.filter(l => l !== selectedLine);
    selectedLine = null;
    redraw();
  }
  contextMenu.style.display = 'none';
});

window.addEventListener('keydown', (evt) => {
  if (evt.ctrlKey && evt.key === 'z') undo();
  if ((evt.key === 'Delete' || evt.key === 'Backspace') && selectedLine) {
    pushUndo();
    lines = lines.filter(l => l !== selectedLine);
    selectedLine = null;
    redraw();
  }
});

canvas.addEventListener('wheel', (evt) => {
  const delta = evt.deltaY < 0 ? 1.1 : 0.9;
  const [x, y] = [evt.offsetX, evt.offsetY];
  const [cx, cy] = toCartesianCoords(x, y);
  scale *= delta;
  const [nx, ny] = toCanvasCoords(cx, cy);
  offsetX += x - nx;
  offsetY += y - ny;
  redraw();
});

colorPicker.addEventListener('input', () => {
  if (selectedLine) {
    selectedLine.color = colorPicker.value;
    redraw();
  }
});

document.body.addEventListener('click', () => {
  contextMenu.style.display = 'none';
});

redraw();
const fullscreenBtn = document.getElementById('fullscreenBtn');
const instructions = document.getElementById('instructions');
const controls = document.getElementById('controls');

let isFullscreenView = false;

function resizeCanvasForFullscreenView(enable) {
  if (enable) {
    // Hide only instructions
    instructions.style.display = 'none';

    // Keep controls visible (no change)

    // Position controls fixed top so canvas can fill rest of viewport
    controls.style.position = 'fixed';
    controls.style.top = '0';
    controls.style.left = '0';
    controls.style.right = '0';
    controls.style.zIndex = '1001';
    controls.style.background = '#f0f0f0';

    // Canvas below controls, fill remaining height
    canvas.style.position = 'fixed';
    canvas.style.top = controls.offsetHeight + 'px';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = `calc(100vh - ${controls.offsetHeight}px)`;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - controls.offsetHeight;

    // Update origin offset for center
    offsetX = canvas.width / 2;
    offsetY = canvas.height / 2;
  } else {
    // Show instructions again
    instructions.style.display = 'block';

    // Reset controls style
    controls.style.position = 'static';
    controls.style.background = '';
    controls.style.zIndex = '';

    // Reset canvas style and size
    canvas.style.position = 'static';
    canvas.style.width = '';
    canvas.style.height = '';
    canvas.width = 800;
    canvas.height = 800;

    offsetX = canvas.width / 2;
    offsetY = canvas.height / 2;
  }
  redraw();
}

fullscreenBtn.addEventListener('click', () => {
  isFullscreenView = !isFullscreenView;
//   fullscreenBtn.textContent = isFullscreenView ? 'Exit Fullscreen View' : 'Fullscreen View';
  resizeCanvasForFullscreenView(isFullscreenView);
});

window.addEventListener('resize', () => {
  if (isFullscreenView) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - controls.offsetHeight;
    offsetX = canvas.width / 2;
    offsetY = canvas.height / 2;
    canvas.style.height = `calc(100vh - ${controls.offsetHeight}px)`;
    redraw();
  }
});