// === Add at top of your script ===
let trianglesAutomatic = [];
let selectedTriangleAutomatic = null;
let isDraggingAutomatic = false;
let triangleStartPointsAutomatic = null;
let dragStartMouseAutomatic = null;
let activeHandleAutomatic = null;
const HANDLE_SIZE_AUTOMATIC = 6;
let undoStackAutomatic = [];
let redoStackAutomatic = [];
let clipboardTriangleAutomatic = null;
let rotatingAutomatic = false;
let initialRotationAutomatic = 0;

function pushUndoAutomatic() {
  // Deep copy lines and triangles to store state snapshot
  const state = {
    lines: linesAutomatic.map(line => ({...line})),
    triangles: trianglesAutomatic.map(tri => ({
      p1: [...tri.p1],
      p2: [...tri.p2],
      p3: [...tri.p3],
      color: tri.color
    })),
  };
  undoStackAutomatic.push(state);
  // Clear redoStack on new action
  redoStackAutomatic = [];
}

function undoAutomatic() {
  if (undoStackAutomatic.length === 0) return;
  const currentState = {
    lines: linesAutomatic.map(line => ({...line})),
    triangles: trianglesAutomatic.map(tri => ({
      p1: [...tri.p1],
      p2: [...tri.p2],
      p3: [...tri.p3],
      color: tri.color
    })),
  };
  redoStackAutomatic.push(currentState);

  const prevState = undoStackAutomatic.pop();
  linesAutomatic = prevState.lines.map(l => Object.assign(Object.create(Object.getPrototypeOf(linesAutomatic[0])), l));
  trianglesAutomatic = prevState.triangles.map(t => new TriangleAutomatic(t.p1, t.p2, t.p3, t.color));

  redrawAutomatic();
}

window.addEventListener('keydown', (e) => {
  // Undo: Ctrl+Z / Cmd+Z
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    undoAutomatic();
  }

  // Delete or Backspace to delete selected triangle
  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedTriangleAutomatic) {
    e.preventDefault();
    pushUndoAutomatic();
    trianglesAutomatic = trianglesAutomatic.filter(t => t !== selectedTriangleAutomatic);
    selectedTriangleAutomatic = null;
    redrawAutomatic();
  }

  // Ctrl+C / Cmd+C to copy selected triangle
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && selectedTriangleAutomatic) {
    e.preventDefault();
    // Save copy of selectedTriangle to clipboard variable
    clipboardTriangleAutomatic = new TriangleAutomatic(
      [...selectedTriangleAutomatic.p1],
      [...selectedTriangleAutomatic.p2],
      [...selectedTriangleAutomatic.p3],
      selectedTriangleAutomatic.color
    );
  }

  // Ctrl+V / Cmd+V to paste copied triangle
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && clipboardTriangleAutomatic) {
    e.preventDefault();
    pushUndoAutomatic();
    const dx = 2, dy = 2; // offset to avoid overlap
    const newTri = new TriangleAutomatic(
      [clipboardTriangleAutomatic.p1[0] + dx, clipboardTriangleAutomatic.p1[1] + dy],
      [clipboardTriangleAutomatic.p2[0] + dx, clipboardTriangleAutomatic.p2[1] + dy],
      [clipboardTriangleAutomatic.p3[0] + dx, clipboardTriangleAutomatic.p3[1] + dy],
      clipboardTriangleAutomatic.color
    );
    trianglesAutomatic.push(newTri);
    selectedTriangleAutomatic = newTri;
    triangleColorPickerAutomatic.value = newTri.color;
    redrawAutomatic();
  }
});

class TriangleAutomatic {
  constructor(p1, p2, p3, color) {
    this.p1 = p1;
    this.p2 = p2;
    this.p3 = p3;
    this.color = color;
    this.rotation = 0; // in radians

    // Determine original topmost vertex
    const vertices = [p1, p2, p3];
    this.originalTopVertexIndex = vertices.reduce((topIndex, vertex, i, arr) =>
      vertex[1] < arr[topIndex][1] ? i : topIndex
    , 0);
  }

  getCenter() {
    const cx = (this.p1[0] + this.p2[0] + this.p3[0]) / 3;
    const cy = (this.p1[1] + this.p2[1] + this.p3[1]) / 3;
    return [cx, cy];
  }

  getRotatedPoints() {
    const [cx, cy] = this.getCenter();
    const rotate = ([x, y]) => {
      const dx = x - cx;
      const dy = y - cy;
      const cos = Math.cos(this.rotation);
      const sin = Math.sin(this.rotation);
      return [
        cx + dx * cos - dy * sin,
        cy + dx * sin + dy * cos
      ];
    };
    return [rotate(this.p1), rotate(this.p2), rotate(this.p3)];
  }

  draw(ctx, toCanvasCoords) {
    const rotatedPoints = this.getRotatedPoints();
    const [c1x, c1y] = toCanvasCoords(...rotatedPoints[0]);
    const [c2x, c2y] = toCanvasCoords(...rotatedPoints[1]);
    const [c3x, c3y] = toCanvasCoords(...rotatedPoints[2]);

    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(c1x, c1y);
    ctx.lineTo(c2x, c2y);
    ctx.lineTo(c3x, c3y);
    ctx.closePath();
    ctx.stroke();

    // Draw resize handles
    ctx.fillStyle = 'blue';
    const handleSize = 6;
    for (const [x, y] of [[c1x, c1y], [c2x, c2y], [c3x, c3y]]) {
      ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
    }

    // Draw rotation handle anchored to original topmost vertex
    const handleOffset = 30;
    ctx.strokeStyle = 'orange';
    ctx.fillStyle = 'orange';

    const topVertexRotated = rotatedPoints[this.originalTopVertexIndex];
    const [topX, topY] = toCanvasCoords(...topVertexRotated);

    // Draw line from vertex upwards
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.lineTo(topX, topY - handleOffset);
    ctx.stroke();

    // Draw rotation handle circle
    ctx.beginPath();
    ctx.arc(topX, topY - handleOffset, 6, 0, 2 * Math.PI);
    ctx.fill();
  }
  
  containsPoint(x, y) {
    const [x1, y1] = this.getRotatedPoints()[0];
    const [x2, y2] = this.getRotatedPoints()[1];
    const [x3, y3] = this.getRotatedPoints()[2];

    function area(x1, y1, x2, y2, x3, y3) {
      return Math.abs((x1*(y2 - y3) + x2*(y3 - y1) + x3*(y1 - y2)) / 2);
    }

    const A = area(x1, y1, x2, y2, x3, y3);
    const A1 = area(x, y, x2, y2, x3, y3);
    const A2 = area(x1, y1, x, y, x3, y3);
    const A3 = area(x1, y1, x2, y2, x, y);
    return Math.abs(A - (A1 + A2 + A3)) < 0.5;
  }
}

function getRotationHandleUnderMouseAutomatic(x, y, triangle, toCanvasCoords) {
  const rotatedPoints = triangle.getRotatedPoints();
  const topVertexRotated = rotatedPoints[triangle.originalTopVertexIndex];
  const [handleX, handleYOrig] = toCanvasCoords(...topVertexRotated);

  const handleY = handleYOrig - 30;  // same offset as in draw()

  const dist = Math.hypot(x - handleX, y - handleY);
  return dist <= 6;  // 6 is handle radius
}

function drawRotationIconAutomatic(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#f90';
  ctx.lineWidth = 2;

  // Draw circular arrow arc
  ctx.beginPath();
  ctx.arc(0, 0, 10, Math.PI * 0.2, Math.PI * 1.6);
  ctx.stroke();

  // Draw arrowhead
  const arrowLength = 5;
  const angle = Math.PI * 1.6;
  const endX = 10 * Math.cos(angle);
  const endY = 10 * Math.sin(angle);
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(endX - 4, endY - 2);
  ctx.lineTo(endX - 2, endY + 4);
  ctx.closePath();
  ctx.fillStyle = '#f90';
  ctx.fill();

  ctx.restore();
}

function getHandleUnderMouseAutomatic(x, y, triangle, toCanvasCoords) {
  const handles = [triangle.p1, triangle.p2, triangle.p3];
  for (let i = 0; i < handles.length; i++) {
    const [cx, cy] = toCanvasCoords(...handles[i]);
    if (
      Math.abs(cx - x) < HANDLE_SIZE_AUTOMATIC &&
      Math.abs(cy - y) < HANDLE_SIZE_AUTOMATIC
    ) {
      return i; // Index of the handle
    }
  }
  return null;
}

// === Inside redraw() replace drawing logic with this ===
function redrawAutomatic() {
  ctxAutomatic.clearRect(0, 0, canvasAutomatic.width, canvasAutomatic.height);
  drawGridAutomatic();
  trianglesAutomatic.forEach(tri => tri.draw(ctxAutomatic, toCanvasCoordsAutomatic));
  linesAutomatic.forEach(line => line.draw(ctxAutomatic, toCanvasCoordsAutomatic, line === selectedLineAutomatic));
}

// === Triangle creation logic ===
function drawTriangleOnCanvasAutomatic(points) {
  if (spaceOptimizationOnAutomatic) {  // <-- your active state flag
    if (!isTriangleInsideBoundsAutomatic(points, spaceOptRectAutomatic)) {
      alert('Error: Triangle is bigger than the rectangle bounds.');
      return;
    }
  }
  pushUndoAutomatic();
  trianglesAutomatic.push(new TriangleAutomatic(points[0], points[1], points[2], colorPickerAutomatic.value));
  redrawAutomatic();
}

// === Triangle UI elements and events ===
const triangleModalElementsAutomatic = {
  drawBtn: document.getElementById('drawTriangleAutomaticBtn'),
  modal: document.getElementById('triangleModalAutomatic'),
  method: document.getElementById('triangleMethodAutomatic'),
  inputs: document.getElementById('triangleInputsAutomatic'),
  createBtn: document.getElementById('createTriangleAutomaticBtn'),
  cancelBtn: document.getElementById('cancelTriangleAutomaticBtn'),
};

const deg2radAutomatic = deg => deg * Math.PI / 180;

triangleModalElementsAutomatic.drawBtn.addEventListener('click', () => {
  triangleModalElementsAutomatic.modal.style.display = 'block';
  updateTriangleInputFieldsAutomatic();
});

triangleModalElementsAutomatic.cancelBtn.addEventListener('click', () => {
  triangleModalElementsAutomatic.modal.style.display = 'none';
});

triangleModalElementsAutomatic.method.addEventListener('change', updateTriangleInputFieldsAutomatic);

function updateTriangleInputFieldsAutomatic() {
  const method = triangleModalElementsAutomatic.method.value;
  const inputs = {
    SSS: `
      <label>Side a: <input type="number" id="sideAAutomatic" /></label><br/>
      <label>Side b: <input type="number" id="sideBAutomatic" /></label><br/>
      <label>Side c: <input type="number" id="sideCAutomatic" /></label>`,
    SAS: `
      <label>Side a: <input type="number" id="sideAAutomatic" /></label><br/>
      <label>Angle C (deg): <input type="number" id="angleCAutomatic" /></label><br/>
      <label>Side b: <input type="number" id="sideBAutomatic" /></label>`,
    AAS: `
      <label>Angle A (deg): <input type="number" id="angleAAutomatic" /></label><br/>
      <label>Angle B (deg): <input type="number" id="angleBAutomatic" /></label><br/>
      <label>Side c: <input type="number" id="sideCAutomatic" /></label>`
  };
  triangleModalElementsAutomatic.inputs.innerHTML = inputs[method];
}

triangleModalElementsAutomatic.createBtn.addEventListener('click', () => {
  const method = triangleModalElementsAutomatic.method.value;
  let pts;

  if (method === 'SSS') {
    const errorContainer = document.getElementById('triangleErrorAutomatic');
    const a = +sideAAutomatic.value, b = +sideBAutomatic.value, c = +sideCAutomatic.value;
    if (a + b <= c || a + c <= b || b + c <= a) {
        let violations = [];
        if (a + b <= c) violations.push(`${a} + ${b} = ${a + b} ≤ c = ${c}`);
        if (a + c <= b) violations.push(`${a} + ${c} = ${a + c} ≤ b = ${b}`);
        if (b + c <= a) violations.push(`${b} + ${c} = ${b + c} ≤ a = ${a}`);

        errorContainer.innerHTML = `
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
      padding: 1em 1em 1em 1em;
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
      <strong>Invalid Triangle</strong>
      <p>The sum of any two sides must be greater than the third side.(Triangle Inequality Theorem)</p>
      <pre style="white-space: pre-wrap; margin: 0 0 1em;">
Violations:
  - ${violations.join('\n  - ')}
      </pre>
      <a href="https://en.wikipedia.org/wiki/Triangle_inequality" target="_blank" style="color:#0066cc; text-decoration:underline;">Learn more</a>
    </div>
  </div>
`;

// Add event listener for close button
document.getElementById('closeErrorBtnAutomatic').addEventListener('click', () => {
  errorContainer.innerHTML = '';
});

        return;
    }
    const A = [0, 0], B = [c, 0];
    const angle = Math.acos((a * a + c * c - b * b) / (2 * a * c));
    const C = [a * Math.cos(angle), a * Math.sin(angle)];
    pts = [A, B, C];
  } else if (method === 'SAS') {
    const a = +sideAAutomatic.value, b = +sideBAutomatic.value, angle = deg2radAutomatic(+angleCAutomatic.value);
    pts = [[0, 0], [a, 0], [b * Math.cos(angle), b * Math.sin(angle)]];
  } else { // AAS
    const Aang = deg2radAutomatic(+angleAAutomatic.value);
    const Bang = deg2radAutomatic(+angleBAutomatic.value);
    const c = +sideCAutomatic.value;
    const Cang = Math.PI - Aang - Bang;
    if (Cang <= 0) return alert('Bad AAS');
    const a = c * Math.sin(Aang) / Math.sin(Cang);
    const A = [0, 0], B = [c, 0];
    const angAtB = Math.PI - Bang;
    pts = [A, B, [a * Math.cos(angAtB), a * Math.sin(angAtB)]];
  }

  triangleModalElementsAutomatic.modal.style.display = 'none';
  drawTriangleOnCanvasAutomatic(pts);
});

// === Triangle context menu ===
function isPointInsideTriangleAutomatic(px, py, triangle, toCanvasCoords) {
  const [x1, y1] = toCanvasCoords(...triangle.p1);
  const [x2, y2] = toCanvasCoords(...triangle.p2);
  const [x3, y3] = toCanvasCoords(...triangle.p3);
  const area = (x1, y1, x2, y2, x3, y3) =>
    Math.abs((x1*(y2 - y3) + x2*(y3 - y1) + x3*(y1 - y2)) / 2.0);
  const A = area(x1, y1, x2, y2, x3, y3);
  const A1 = area(px, py, x2, y2, x3, y3);
  const A2 = area(x1, y1, px, py, x3, y3);
  const A3 = area(x1, y1, x2, y2, px, py);
  return Math.abs(A - (A1 + A2 + A3)) < 1e-2;
}

const triangleContextMenuAutomatic = document.getElementById('triangleContextMenuAutomatic');
function hideTriangleContextMenuAutomatic() {
  triangleContextMenuAutomatic.style.display = 'none';
}

canvasAutomatic.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const rect = canvasAutomatic.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  selectedTriangleAutomatic = trianglesAutomatic.find(tri =>
    isPointInsideTriangleAutomatic(x, y, tri, toCanvasCoordsAutomatic));

  if (selectedTriangleAutomatic) {
    triangleColorPickerAutomatic.value = selectedTriangleAutomatic.color;  // <-- sync color picker!
    triangleContextMenuAutomatic.style.left = `${e.pageX}px`;
    triangleContextMenuAutomatic.style.top = `${e.pageY}px`;
    triangleContextMenuAutomatic.style.display = 'block';
  } else {
    hideTriangleContextMenuAutomatic();
  }
});

document.getElementById('copyTriangleAutomatic').addEventListener('click', () => {
  if (!selectedTriangleAutomatic) return;
  pushUndoAutomatic();
  const dx = 2, dy = 2;
  const newTri = new TriangleAutomatic(
    [selectedTriangleAutomatic.p1[0] + dx, selectedTriangleAutomatic.p1[1] + dy],
    [selectedTriangleAutomatic.p2[0] + dx, selectedTriangleAutomatic.p2[1] + dy],
    [selectedTriangleAutomatic.p3[0] + dx, selectedTriangleAutomatic.p3[1] + dy],
    selectedTriangleAutomatic.color
  );
  trianglesAutomatic.push(newTri);
  redrawAutomatic();
  hideTriangleContextMenuAutomatic();
});

document.getElementById('deleteTriangleAutomatic').addEventListener('click', () => {
  if (!selectedTriangleAutomatic) return;
  pushUndoAutomatic();
  trianglesAutomatic = trianglesAutomatic.filter(t => t !== selectedTriangleAutomatic);
  redrawAutomatic();
  hideTriangleContextMenuAutomatic();
});

// === Dragging and resizing triangles ===
canvasAutomatic.addEventListener('mousedown', (e) => {
  hideTriangleContextMenuAutomatic();
  const rect = canvasAutomatic.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  for (const tri of trianglesAutomatic) {
    const handleIndex = getHandleUnderMouseAutomatic(x, y, tri, toCanvasCoordsAutomatic);
    if (handleIndex !== null) {
      selectedTriangleAutomatic = tri;
      triangleColorPickerAutomatic.value = selectedTriangleAutomatic.color;
      isDraggingAutomatic = true;
      activeHandleAutomatic = handleIndex;
      dragStartMouseAutomatic = [x, y];
      triangleStartPointsAutomatic = [ [...tri.p1], [...tri.p2], [...tri.p3] ];
      return;
    }

    if (isPointInsideTriangleAutomatic(x, y, tri, toCanvasCoordsAutomatic)) {
      selectedTriangleAutomatic = tri;
      triangleColorPickerAutomatic.value = selectedTriangleAutomatic.color;
      isDraggingAutomatic = true;
      activeHandleAutomatic = null;
      dragStartMouseAutomatic = [x, y];
      triangleStartPointsAutomatic = [ [...tri.p1], [...tri.p2], [...tri.p3] ];
      return;
    }
    if (getRotationHandleUnderMouseAutomatic(x, y, tri, toCanvasCoordsAutomatic)) {
        selectedTriangleAutomatic = tri;
        triangleColorPickerAutomatic.value = selectedTriangleAutomatic.color;
        isDraggingAutomatic = true;
        rotatingAutomatic = true;
        dragStartMouseAutomatic = [x, y];
        initialRotationAutomatic = tri.rotation;
        return;
    }
  }
  selectedTriangleAutomatic = null;
});

canvasAutomatic.addEventListener('mousemove', (e) => {
  const rect = canvasAutomatic.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  let hoveringHandle = false;
  for (const tri of trianglesAutomatic) {
    // Check if hovering rotation handle
    if (getRotationHandleUnderMouseAutomatic(x, y, tri, toCanvasCoordsAutomatic)) {
        canvasAutomatic.style.cursor = 'crosshair'; // or 'grab', whatever you prefer
        hoveringHandle = true;
        break;
    }
    if (getHandleUnderMouseAutomatic(x, y, tri, toCanvasCoordsAutomatic) !== null) {
      canvasAutomatic.style.cursor = 'nwse-resize'; // show resize cursor immediately on hover
      hoveringHandle = true;
      break;
    }
  }

  if (!hoveringHandle) {
    if (trianglesAutomatic.some(tri => isPointInsideTriangleAutomatic(x, y, tri, toCanvasCoordsAutomatic))) {
      canvasAutomatic.style.cursor = 'move'; // show move cursor when hovering inside triangle but not on handle
    } else if (!isDraggingAutomatic) {
      canvasAutomatic.style.cursor = 'default'; // default cursor outside triangles/handles
    }
  }

  // Only drag if currently dragging a triangle or handle
  if (!isDraggingAutomatic || !selectedTriangleAutomatic) return;
  if (rotatingAutomatic) {
  const [cx, cy] = toCanvasCoordsAutomatic(...selectedTriangleAutomatic.getCenter());
  const angleStart = Math.atan2(dragStartMouseAutomatic[1] - cy, dragStartMouseAutomatic[0] - cx);
  const angleNow = Math.atan2(y - cy, x - cx);
  const deltaAngle = angleNow - angleStart;
  const rotatedPoints = selectedTriangleAutomatic.getRotatedPoints();
  if (spaceOptimizationOnAutomatic && !isTriangleInsideBoundsAutomatic(rotatedPoints, spaceOptRectAutomatic)) {
    // Don't update rotation beyond bounds
    return;
  }
  selectedTriangleAutomatic.rotation = initialRotationAutomatic + deltaAngle;
  redrawAutomatic();
  return;
}

  const dx = (x - dragStartMouseAutomatic[0]) / scaleAutomatic;
  const dy = -(y - dragStartMouseAutomatic[1]) / scaleAutomatic;

  let newPoints;

  if (activeHandleAutomatic !== null) {
    newPoints = [...triangleStartPointsAutomatic];
    newPoints[activeHandleAutomatic] = [
      triangleStartPointsAutomatic[activeHandleAutomatic][0] + dx,
      triangleStartPointsAutomatic[activeHandleAutomatic][1] + dy
    ];
  } else {
    newPoints = triangleStartPointsAutomatic.map(p => [p[0] + dx, p[1] + dy]);
  }

  if (spaceOptimizationOnAutomatic) {
    const tempTri = new TriangleAutomatic(newPoints[0], newPoints[1], newPoints[2], selectedTriangleAutomatic.color);
    tempTri.rotation = selectedTriangleAutomatic.rotation;

    if (!isTriangleInsideBoundsAutomatic(tempTri.getRotatedPoints(), spaceOptRectAutomatic)) {
      return; // Block drag if rotated shape would go outside
    }
  }


  // Update points if inside bounds
  if (activeHandleAutomatic !== null) {
    selectedTriangleAutomatic[`p${activeHandleAutomatic + 1}`] = newPoints[activeHandleAutomatic];
  } else {
    selectedTriangleAutomatic.p1 = newPoints[0];
    selectedTriangleAutomatic.p2 = newPoints[1];
    selectedTriangleAutomatic.p3 = newPoints[2];
  }
  redrawAutomatic();
});

canvasAutomatic.addEventListener('mouseup', () => {
  if (isDraggingAutomatic) pushUndoAutomatic();
  isDraggingAutomatic = false;
  triangleStartPointsAutomatic = null;
  dragStartMouseAutomatic = null;
  activeHandleAutomatic = null;
  rotatingAutomatic = false;
  canvasAutomatic.style.cursor = 'default';
});

const triangleColorPickerAutomatic = document.getElementById('triangleColorPickerAutomatic');

triangleColorPickerAutomatic.addEventListener('input', () => {
  if (selectedTriangleAutomatic) {
    pushUndoAutomatic();
    selectedTriangleAutomatic.color = triangleColorPickerAutomatic.value;
    redrawAutomatic();
  }
});

function isTriangleInsideBoundsAutomatic(points, rect) {
  return points.every(([x, y]) => 
    x >= rect.x && x <= rect.x + rect.width &&
    y >= rect.y && y <= rect.y + rect.height
  );
}