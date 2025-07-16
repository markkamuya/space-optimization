const canvasAutomatic = document.getElementById('canvasAutomatic');
const ctxAutomatic = canvasAutomatic.getContext('2d');
const coordsDisplayAutomatic = document.getElementById('coordsAutomatic');
const drawModeBtnAutomatic = document.getElementById('drawModeBtnAutomatic');
const arrowToggleBtnAutomatic = document.getElementById('arrowToggleBtnAutomatic');
const colorPickerAutomatic = document.getElementById('colorPickerAutomatic');
const contextMenuAutomatic = document.getElementById('contextMenuAutomatic');
const deleteLineBtnAutomatic = document.getElementById('deleteLineBtnAutomatic');
const buttonAutomatic = document.getElementById('spaceOptBtnAutomatic');
const errorContainerAutomatic = document.getElementById('errorContainerAutomatic');
const coordTooltipAutomatic = document.getElementById('coordTooltipAutomatic');
const fullscreenBtnAutomatic = document.getElementById('fullscreenBtnAutomatic');
const instructionsAutomatic = document.getElementById('instructionsAutomatic');
const controlsAutomatic = document.getElementById('controlsAutomatic');

let scaleAutomatic = 40;
let offsetXAutomatic = canvasAutomatic.width / 2;
let offsetYAutomatic = canvasAutomatic.height / 2;

let linesAutomatic = [];
let isArrowModeAutomatic = false;
let isDrawingAutomatic = false;
let drawStartAutomatic = null;
let tempMousePosAutomatic = null;
let selectedLineAutomatic = null;
let dragInfoAutomatic = null;
let isPanningAutomatic = false;
let panStartAutomatic = null;
const UNDO_STACK_AUTOMATIC = [];

const pixelsPerUnitAutomatic = scaleAutomatic;
const originXAutomatic = offsetXAutomatic;
const originYAutomatic = offsetYAutomatic;

let spaceOptRectAutomatic = null;
let spaceOptimizationOnAutomatic = false;

buttonAutomatic.addEventListener('click', () => {
  let widthUnitsAutomatic = prompt("Enter the width of the rectangle (in units):");
  let heightUnitsAutomatic = prompt("Enter the height of the rectangle (in units):");

  widthUnitsAutomatic = Number(widthUnitsAutomatic);
  heightUnitsAutomatic = Number(heightUnitsAutomatic);

  let messagesAutomatic = [];

  if (isNaN(widthUnitsAutomatic)) {
    messagesAutomatic.push(`Width (${widthUnitsAutomatic}) ∉ ℝ (not a real number).`);
  } else if (!isFinite(widthUnitsAutomatic)) {
    messagesAutomatic.push(`Width (${widthUnitsAutomatic}) ∉ ℝ (not finite).`);
  } else if (!(widthUnitsAutomatic > 0)) {
    messagesAutomatic.push(`Width (${widthUnitsAutomatic}) ≤ 0 (not positive).`);
  }

  if (isNaN(heightUnitsAutomatic)) {
    messagesAutomatic.push(`Height (${heightUnitsAutomatic}) ∉ ℝ (not a real number).`);
  } else if (!isFinite(heightUnitsAutomatic)) {
    messagesAutomatic.push(`Height (${heightUnitsAutomatic}) ∉ ℝ (not finite).`);
  } else if (!(heightUnitsAutomatic > 0)) {
    messagesAutomatic.push(`Height (${heightUnitsAutomatic}) ≤ 0 (not positive).`);
  }

  if (messagesAutomatic.length > 0) {
    alert("Invalid input: Width and height must be finite, positive real numbers representing physical lengths.\n" + messagesAutomatic.join("\n"));
    return;
  }

  if (widthUnitsAutomatic === heightUnitsAutomatic) {
    errorContainerAutomatic.innerHTML = `
      <div style="
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0, 0, 0, 0.3);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
      ">
        <div style="
          position: relative;
          max-width: 400px;
          margin: 1em;
          padding: 1em;
          background: #fee;
          border: 1px solid #f00;
          color: #900;
          border-radius: 6px;
          box-shadow: 0 0 15px rgba(255, 0, 0, 0.3);
        ">
          <button id="closeErrorBtnAutomatic" style="
            position: absolute;
            top: 8px;
            right: 8px;
            background: transparent;
            border: none;
            color: #900;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
          " aria-label="Close error popup">&times;</button>
          <strong>Invalid Rectangle</strong>
          <p>The rectangle must be oblong, a non-square rectangle where width ≠ height.</p>
          <a href="https://en.wikipedia.org/wiki/Oblong" target="_blank" style="color:#0066cc; text-decoration:underline;">Learn more about oblongs</a>
        </div>
      </div>
    `;

    document.getElementById('closeErrorBtnAutomatic').addEventListener('click', () => {
      errorContainerAutomatic.innerHTML = '';
    });
    return;
  }

  const rectAutomatic = new RectangleAutomatic(0, 0, widthUnitsAutomatic, heightUnitsAutomatic, colorPickerAutomatic.value);
  spaceOptRectAutomatic = rectAutomatic;
  spaceOptimizationOnAutomatic = true;
  buttonAutomatic.style.backgroundColor = '#4CAF50';
  buttonAutomatic.style.color = '#fff';
  pushUndoAutomatic();
  linesAutomatic.push(rectAutomatic);
  redrawAutomatic();
});

class LineAutomatic {
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
    const c = new LineAutomatic(this.x1, this.y1, this.x2, this.y2, this.color);
    c.isArrow = this.isArrow;
    return c;
  }
}

class RectangleAutomatic {
  constructor(x = 0, y = 0, width, height, color = '#0000FF') {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;
  }
  containsPoint(x, y) {
    return (
      x >= this.x &&
      x <= this.x + this.width &&
      y >= this.y &&
      y <= this.y + this.height
    );
  }
  draw(ctx, toCanvasCoords, highlight = false) {
    const [cx, cy] = toCanvasCoords(this.x, this.y);
    const widthPx = this.width * scaleAutomatic;
    const heightPx = this.height * scaleAutomatic;

    ctx.strokeStyle = highlight ? '#4CAF50' : this.color;
    ctx.lineWidth = highlight ? 4 : 2;
    ctx.strokeRect(cx, cy - heightPx, widthPx, heightPx);
  }
  clone() {
    return new RectangleAutomatic(this.x, this.y, this.width, this.height, this.color);
  }
}

class ArrowLineAutomatic extends LineAutomatic {
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

function toCanvasCoordsAutomatic(x, y) {
  return [offsetXAutomatic + x * scaleAutomatic, offsetYAutomatic - y * scaleAutomatic];
}

function toCartesianCoordsAutomatic(cx, cy) {
  return [(cx - offsetXAutomatic) / scaleAutomatic, (offsetYAutomatic - cy) / scaleAutomatic];
}

function redrawAutomatic() {
  ctxAutomatic.clearRect(0, 0, canvasAutomatic.width, canvasAutomatic.height);
  drawGridAutomatic();

  // Debug: Show coordinate system info
  console.log("--- Redraw Debug ---");
  console.log(`Canvas size: ${canvasAutomatic.width}x${canvasAutomatic.height}`);
  console.log(`Offset: (${offsetXAutomatic}, ${offsetYAutomatic})`);
  console.log(`Scale: ${scaleAutomatic}`);

  // Draw all elements
  for (const item of linesAutomatic) {
    if (item instanceof LineAutomatic || item instanceof ArrowLineAutomatic) {
      item.draw(ctxAutomatic, toCanvasCoordsAutomatic, item === selectedLineAutomatic);
    } else if (item instanceof RectangleAutomatic) {
      item.draw(ctxAutomatic, toCanvasCoordsAutomatic, item === selectedLineAutomatic);
    } else if (item instanceof TriangleAutomatic) {
      console.log("Drawing triangle at:", 
        `(${item.x1},${item.y1})`, 
        `(${item.x2},${item.y2})`, 
        `(${item.x3},${item.y3})`
      );
      item.draw(ctxAutomatic, toCanvasCoordsAutomatic);
    }
  }

  // Draw temporary construction line
  if (isDrawingAutomatic && drawStartAutomatic && tempMousePosAutomatic) {
    const color = colorPickerAutomatic.value;
    const tmp = isArrowModeAutomatic ?
      new ArrowLineAutomatic(drawStartAutomatic.x, drawStartAutomatic.y, tempMousePosAutomatic.x, tempMousePosAutomatic.y, color) :
      new LineAutomatic(drawStartAutomatic.x, drawStartAutomatic.y, tempMousePosAutomatic.x, tempMousePosAutomatic.y, color);
    tmp.draw(ctxAutomatic, toCanvasCoordsAutomatic, true);
  }

  // Debug: Draw origin point
  ctxAutomatic.fillStyle = 'red';
  ctxAutomatic.beginPath();
  const [originX, originY] = toCanvasCoordsAutomatic(0, 0);
  ctxAutomatic.arc(originX, originY, 5, 0, Math.PI*2);
  ctxAutomatic.fill();
}

function drawGridAutomatic() {
  ctxAutomatic.strokeStyle = '#ddd';
  ctxAutomatic.lineWidth = 1;
  ctxAutomatic.font = '12px sans-serif';
  ctxAutomatic.fillStyle = '#444';

  const left = -offsetXAutomatic / scaleAutomatic;
  const right = (canvasAutomatic.width - offsetXAutomatic) / scaleAutomatic;
  const top = offsetYAutomatic / scaleAutomatic;
  const bottom = -(canvasAutomatic.height - offsetYAutomatic) / scaleAutomatic;

  for (let x = Math.floor(left); x <= right; x++) {
    const [cx] = toCanvasCoordsAutomatic(x, 0);
    ctxAutomatic.beginPath(); ctxAutomatic.moveTo(cx, 0); ctxAutomatic.lineTo(cx, canvasAutomatic.height); ctxAutomatic.stroke();
    if (x !== 0) ctxAutomatic.fillText(x, cx + 2, offsetYAutomatic + 14);
  }

  for (let y = Math.floor(bottom); y <= top; y++) {
    const [, cy] = toCanvasCoordsAutomatic(0, y);
    ctxAutomatic.beginPath(); ctxAutomatic.moveTo(0, cy); ctxAutomatic.lineTo(canvasAutomatic.width, cy); ctxAutomatic.stroke();
    if (y !== 0) ctxAutomatic.fillText(y, offsetXAutomatic + 4, cy - 4);
  }

  ctxAutomatic.strokeStyle = '#000';
  ctxAutomatic.lineWidth = 2;
  ctxAutomatic.beginPath(); ctxAutomatic.moveTo(0, offsetYAutomatic); ctxAutomatic.lineTo(canvasAutomatic.width, offsetYAutomatic); ctxAutomatic.stroke();
  ctxAutomatic.beginPath(); ctxAutomatic.moveTo(offsetXAutomatic, 0); ctxAutomatic.lineTo(offsetXAutomatic, canvasAutomatic.height); ctxAutomatic.stroke();
}

function findLineAtAutomatic(x, y) {
  const tolerance = 0.15;
  for (let i = linesAutomatic.length - 1; i >= 0; i--) {
    const l = linesAutomatic[i];
    if (!(l instanceof LineAutomatic || l instanceof ArrowLineAutomatic)) continue;

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

function isNearEndpointAutomatic(x, y, line) {
  const d1 = Math.hypot(line.x1 - x, line.y1 - y);
  const d2 = Math.hypot(line.x2 - x, line.y2 - y);
  if (d1 < 0.2) return 'start';
  if (d2 < 0.2) return 'end';
  return null;
}

function pushUndoAutomatic() {
  UNDO_STACK_AUTOMATIC.push(linesAutomatic.map(l => l.clone()));
}

function undoAutomatic() {
  if (UNDO_STACK_AUTOMATIC.length > 0) {
    const lastState = UNDO_STACK_AUTOMATIC.pop();
    linesAutomatic = lastState.map(l => {
      if (typeof l.clone === 'function') return l.clone();
      console.warn('Uncloneable object on undo:', l);
      return l;
    });
    selectedLineAutomatic = null;
    redrawAutomatic();
  }
}

// --- Mouse Events ---
canvasAutomatic.addEventListener('mousedown', (evt) => {
  if (evt.button === 1 || evt.button === 2) {
    isPanningAutomatic = true;
    panStartAutomatic = { x: evt.clientX, y: evt.clientY, offsetX: offsetXAutomatic, offsetY: offsetYAutomatic };
    return;
  }

  const [x, y] = toCartesianCoordsAutomatic(evt.offsetX, evt.offsetY);
  drawStartAutomatic = { x, y };
  selectedLineAutomatic = findLineAtAutomatic(x, y);

  // If no line was hit, check if a rectangle was clicked
  if (!selectedLineAutomatic) {
    for (let i = linesAutomatic.length - 1; i >= 0; i--) {
      const item = linesAutomatic[i];
      if (item instanceof RectangleAutomatic && item.containsPoint(x, y)) {
        selectedLineAutomatic = item;
        break;
      }
    }
  }

  if (selectedLineAutomatic instanceof LineAutomatic || selectedLineAutomatic instanceof ArrowLineAutomatic) {
    dragInfoAutomatic = {
      type: isNearEndpointAutomatic(x, y, selectedLineAutomatic) || 'move',
      startX: x,
      startY: y,
      orig: selectedLineAutomatic.clone()
    };
  } else if (!selectedLineAutomatic && drawModeBtnAutomatic.classList.contains('active')) {
    isDrawingAutomatic = true;
    tempMousePosAutomatic = { x, y };
  }
  redrawAutomatic();
});

canvasAutomatic.addEventListener('mousemove', (evt) => {
  const [x, y] = toCartesianCoordsAutomatic(evt.offsetX, evt.offsetY);

  // Show and position tooltip
  coordTooltipAutomatic.style.display = 'block';
  coordTooltipAutomatic.textContent = `(${x.toFixed(2)}, ${y.toFixed(2)})`;

  // Position top-right of pointer
  const tooltipX = evt.clientX + 4;
  const tooltipY = y >= 0 ? evt.clientY - 6 : evt.clientY + 6;
  coordTooltipAutomatic.style.left = tooltipX + 'px';
  coordTooltipAutomatic.style.top = tooltipY + 'px';

  if (isPanningAutomatic && panStartAutomatic) {
    offsetXAutomatic = panStartAutomatic.offsetX + (evt.clientX - panStartAutomatic.x);
    offsetYAutomatic = panStartAutomatic.offsetY + (evt.clientY - panStartAutomatic.y);
    redrawAutomatic();
    return;
  }

  if (drawModeBtnAutomatic.classList.contains('active')) {
    canvasAutomatic.style.cursor = 'crosshair';
  } else {
    const hoverLine = findLineAtAutomatic(x, y);
    if (hoverLine) {
      const endpoint = isNearEndpointAutomatic(x, y, hoverLine);
      canvasAutomatic.style.cursor =
        endpoint === 'start' ? 'nwse-resize' :
        endpoint === 'end' ? 'nesw-resize' :
        'move';
    } else {
      canvasAutomatic.style.cursor = 'grab';
    }
  }

  if (isDrawingAutomatic && tempMousePosAutomatic) {
    tempMousePosAutomatic = { x, y };
    redrawAutomatic();
  }

  if (dragInfoAutomatic && selectedLineAutomatic) {
    const dx = x - dragInfoAutomatic.startX;
    const dy = y - dragInfoAutomatic.startY;
    if (dragInfoAutomatic.type === 'move') {
      selectedLineAutomatic.x1 = dragInfoAutomatic.orig.x1 + dx;
      selectedLineAutomatic.y1 = dragInfoAutomatic.orig.y1 + dy;
      selectedLineAutomatic.x2 = dragInfoAutomatic.orig.x2 + dx;
      selectedLineAutomatic.y2 = dragInfoAutomatic.orig.y2 + dy;
    } else if (dragInfoAutomatic.type === 'start') {
      selectedLineAutomatic.x1 = x; selectedLineAutomatic.y1 = y;
    } else if (dragInfoAutomatic.type === 'end') {
      selectedLineAutomatic.x2 = x; selectedLineAutomatic.y2 = y;
    }
    redrawAutomatic();
  }
});

canvasAutomatic.addEventListener('mouseleave', () => {
  coordTooltipAutomatic.style.display = 'none';
});

canvasAutomatic.addEventListener('mouseup', () => {
  if (isDrawingAutomatic && drawStartAutomatic && tempMousePosAutomatic) {
    pushUndoAutomatic();
    const color = colorPickerAutomatic.value;
    const newLine = isArrowModeAutomatic ?
      new ArrowLineAutomatic(drawStartAutomatic.x, drawStartAutomatic.y, tempMousePosAutomatic.x, tempMousePosAutomatic.y, color) :
      new LineAutomatic(drawStartAutomatic.x, drawStartAutomatic.y, tempMousePosAutomatic.x, tempMousePosAutomatic.y, color);
    linesAutomatic.push(newLine);
    isDrawingAutomatic = false; drawStartAutomatic = null; tempMousePosAutomatic = null;
  }
  if (dragInfoAutomatic) pushUndoAutomatic();
  dragInfoAutomatic = null;
  isPanningAutomatic = false;
  panStartAutomatic = null;
  redrawAutomatic();
});

// Touch events
canvasAutomatic.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) {
    isPanningAutomatic = true;
    const touch = e.touches[0];
    panStartAutomatic = { x: touch.clientX, y: touch.clientY, offsetX: offsetXAutomatic, offsetY: offsetYAutomatic };
  }
}, { passive: false });

canvasAutomatic.addEventListener('touchmove', (e) => {
  if (isPanningAutomatic && panStartAutomatic && e.touches.length === 1) {
    const touch = e.touches[0];
    offsetXAutomatic = panStartAutomatic.offsetX + (touch.clientX - panStartAutomatic.x);
    offsetYAutomatic = panStartAutomatic.offsetY + (touch.clientY - panStartAutomatic.y);
    redrawAutomatic();
  }
}, { passive: false });

canvasAutomatic.addEventListener('touchend', () => {
  isPanningAutomatic = false;
  panStartAutomatic = null;
});

drawModeBtnAutomatic.addEventListener('click', () => {
  drawModeBtnAutomatic.classList.toggle('active');
});

arrowToggleBtnAutomatic.addEventListener('click', () => {
  isArrowModeAutomatic = !isArrowModeAutomatic;
  arrowToggleBtnAutomatic.textContent = `Arrow Lines: ${isArrowModeAutomatic ? 'ON' : 'OFF'}`;
});

canvasAutomatic.addEventListener('contextmenu', (evt) => {
  evt.preventDefault();
  const [x, y] = toCartesianCoordsAutomatic(evt.offsetX, evt.offsetY);
  const hit = findLineAtAutomatic(x, y);
  if (hit) {
    selectedLineAutomatic = hit;
    redrawAutomatic();
    contextMenuAutomatic.style.left = evt.clientX + 'px';
    contextMenuAutomatic.style.top = evt.clientY + 'px';
    contextMenuAutomatic.style.display = 'block';
  } else {
    contextMenuAutomatic.style.display = 'none';
  }
});

deleteLineBtnAutomatic.addEventListener('click', () => {
  if (selectedLineAutomatic) {
    pushUndoAutomatic();
    linesAutomatic = linesAutomatic.filter(l => l !== selectedLineAutomatic);
    selectedLineAutomatic = null;
    redrawAutomatic();
  }
  contextMenuAutomatic.style.display = 'none';
});

window.addEventListener('keydown', (evt) => {
  if (evt.ctrlKey && evt.key === 'z') undoAutomatic();
  if ((evt.key === 'Delete' || evt.key === 'Backspace') && selectedLineAutomatic) {
    pushUndoAutomatic();
    linesAutomatic = linesAutomatic.filter(l => l !== selectedLineAutomatic);
    selectedLineAutomatic = null;
    redrawAutomatic();
  }
});

canvasAutomatic.addEventListener('wheel', (evt) => {
  const delta = evt.deltaY < 0 ? 1.1 : 0.9;
  const [x, y] = [evt.offsetX, evt.offsetY];
  const [cx, cy] = toCartesianCoordsAutomatic(x, y);
  scaleAutomatic *= delta;
  const [nx, ny] = toCanvasCoordsAutomatic(cx, cy);
  offsetXAutomatic += x - nx;
  offsetYAutomatic += y - ny;
  redrawAutomatic();
});

colorPickerAutomatic.addEventListener('input', () => {
  if (selectedLineAutomatic) {
    selectedLineAutomatic.color = colorPickerAutomatic.value;
    redrawAutomatic();
  }
});

document.body.addEventListener('click', () => {
  contextMenuAutomatic.style.display = 'none';
});

redrawAutomatic();

let isFullscreenViewAutomatic = false;

function resizeCanvasForFullscreenViewAutomatic(enable) {
  if (enable) {
    instructionsAutomatic.style.display = 'none';
    controlsAutomatic.style.position = 'fixed';
    controlsAutomatic.style.top = '0';
    controlsAutomatic.style.left = '0';
    controlsAutomatic.style.right = '0';
    controlsAutomatic.style.zIndex = '1001';
    controlsAutomatic.style.background = '#f0f0f0';

    canvasAutomatic.style.position = 'fixed';
    canvasAutomatic.style.top = controlsAutomatic.offsetHeight + 'px';
    canvasAutomatic.style.left = '0';
    canvasAutomatic.style.width = '100vw';
    canvasAutomatic.style.height = `calc(100vh - ${controlsAutomatic.offsetHeight}px)`;

    canvasAutomatic.width = window.innerWidth;
    canvasAutomatic.height = window.innerHeight - controlsAutomatic.offsetHeight;

    offsetXAutomatic = canvasAutomatic.width / 2;
    offsetYAutomatic = canvasAutomatic.height / 2;
  } else {
    instructionsAutomatic.style.display = 'block';
    controlsAutomatic.style.position = 'static';
    controlsAutomatic.style.background = '';
    controlsAutomatic.style.zIndex = '';

    canvasAutomatic.style.position = 'static';
    canvasAutomatic.style.width = '';
    canvasAutomatic.style.height = '';
    canvasAutomatic.width = 800;
    canvasAutomatic.height = 800;

    offsetXAutomatic = canvasAutomatic.width / 2;
    offsetYAutomatic = canvasAutomatic.height / 2;
  }
  redrawAutomatic();
}

fullscreenBtnAutomatic.addEventListener('click', () => {
  isFullscreenViewAutomatic = !isFullscreenViewAutomatic;
  resizeCanvasForFullscreenViewAutomatic(isFullscreenViewAutomatic);
});

window.addEventListener('resize', () => {
  if (isFullscreenViewAutomatic) {
    canvasAutomatic.width = window.innerWidth;
    canvasAutomatic.height = window.innerHeight - controlsAutomatic.offsetHeight;
    offsetXAutomatic = canvasAutomatic.width / 2;
    offsetYAutomatic = canvasAutomatic.height / 2;
    canvasAutomatic.style.height = `calc(100vh - ${controlsAutomatic.offsetHeight}px)`;
    redrawAutomatic();
  }
});