// === Add at top of your script ===
let triangles = [];
let selectedTriangle = null;
let isDragging = false;
let triangleStartPoints = null;
let dragStartMouse = null;
let activeHandle = null;
const HANDLE_SIZE = 6;
let undoStack = [];
let redoStack = [];
let clipboardTriangle = null;
let rotating = false;
let initialRotation = 0;

function pushUndo() {
  // Deep copy lines and triangles to store state snapshot
  const state = {
    lines: lines.map(line => ({...line})),
    triangles: triangles.map(tri => ({
      p1: [...tri.p1],
      p2: [...tri.p2],
      p3: [...tri.p3],
      color: tri.color
    })),
  };
  undoStack.push(state);
  // Clear redoStack on new action
  redoStack = [];
}

function undo() {
  if (undoStack.length === 0) return;
  const currentState = {
    lines: lines.map(line => ({...line})),
    triangles: triangles.map(tri => ({
      p1: [...tri.p1],
      p2: [...tri.p2],
      p3: [...tri.p3],
      color: tri.color
    })),
  };
  redoStack.push(currentState);

  const prevState = undoStack.pop();
  lines = prevState.lines.map(l => Object.assign(Object.create(Object.getPrototypeOf(lines[0])), l));
  triangles = prevState.triangles.map(t => new Triangle(t.p1, t.p2, t.p3, t.color));

  redraw();
}

window.addEventListener('keydown', (e) => {
  // Undo: Ctrl+Z / Cmd+Z
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    undo();
  }

  // Delete or Backspace to delete selected triangle
  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedTriangle) {
    e.preventDefault();
    pushUndo();
    triangles = triangles.filter(t => t !== selectedTriangle);
    selectedTriangle = null;
    redraw();
  }

  // Ctrl+C / Cmd+C to copy selected triangle
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && selectedTriangle) {
    e.preventDefault();
    // Save copy of selectedTriangle to clipboard variable
    clipboardTriangle = new Triangle(
      [...selectedTriangle.p1],
      [...selectedTriangle.p2],
      [...selectedTriangle.p3],
      selectedTriangle.color
    );
  }

  // Ctrl+V / Cmd+V to paste copied triangle
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && clipboardTriangle) {
    e.preventDefault();
    pushUndo();
    const dx = 2, dy = 2; // offset to avoid overlap
    const newTri = new Triangle(
      [clipboardTriangle.p1[0] + dx, clipboardTriangle.p1[1] + dy],
      [clipboardTriangle.p2[0] + dx, clipboardTriangle.p2[1] + dy],
      [clipboardTriangle.p3[0] + dx, clipboardTriangle.p3[1] + dy],
      clipboardTriangle.color
    );
    triangles.push(newTri);
    selectedTriangle = newTri;
    triangleColorPicker.value = newTri.color;
    redraw();
  }
});

class Triangle {
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
}

function getRotationHandleUnderMouse(x, y, triangle, toCanvasCoords) {
  const rotatedPoints = triangle.getRotatedPoints();
  const topVertexRotated = rotatedPoints[triangle.originalTopVertexIndex];
  const [handleX, handleYOrig] = toCanvasCoords(...topVertexRotated);

  const handleY = handleYOrig - 30;  // same offset as in draw()

  const dist = Math.hypot(x - handleX, y - handleY);
  return dist <= 6;  // 6 is handle radius
}

function drawRotationIcon(ctx, x, y) {
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

function getHandleUnderMouse(x, y, triangle, toCanvasCoords) {
  const handles = [triangle.p1, triangle.p2, triangle.p3];
  for (let i = 0; i < handles.length; i++) {
    const [cx, cy] = toCanvasCoords(...handles[i]);
    if (
      Math.abs(cx - x) < HANDLE_SIZE &&
      Math.abs(cy - y) < HANDLE_SIZE
    ) {
      return i; // Index of the handle
    }
  }
  return null;
}

// === Inside redraw() replace drawing logic with this ===
function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  triangles.forEach(tri => tri.draw(ctx, toCanvasCoords));
  lines.forEach(line => line.draw(ctx, toCanvasCoords, line === selectedLine));
}

// === Triangle creation logic ===
function drawTriangleOnCanvas(points) {
  pushUndo();
  triangles.push(new Triangle(points[0], points[1], points[2], colorPicker.value));
  redraw();
}

// === Triangle UI elements and events ===
const triangleModalElements = {
  drawBtn: document.getElementById('drawTriangleBtn'),
  modal: document.getElementById('triangleModal'),
  method: document.getElementById('triangleMethod'),
  inputs: document.getElementById('triangleInputs'),
  createBtn: document.getElementById('createTriangleBtn'),
  cancelBtn: document.getElementById('cancelTriangleBtn'),
};

const deg2rad = deg => deg * Math.PI / 180;

triangleModalElements.drawBtn.addEventListener('click', () => {
  triangleModalElements.modal.style.display = 'block';
  updateTriangleInputFields();
});

triangleModalElements.cancelBtn.addEventListener('click', () => {
  triangleModalElements.modal.style.display = 'none';
});

triangleModalElements.method.addEventListener('change', updateTriangleInputFields);

function updateTriangleInputFields() {
  const method = triangleModalElements.method.value;
  const inputs = {
    SSS: `
      <label>Side a: <input type="number" id="sideA" /></label><br/>
      <label>Side b: <input type="number" id="sideB" /></label><br/>
      <label>Side c: <input type="number" id="sideC" /></label>`,
    SAS: `
      <label>Side a: <input type="number" id="sideA" /></label><br/>
      <label>Angle C (deg): <input type="number" id="angleC" /></label><br/>
      <label>Side b: <input type="number" id="sideB" /></label>`,
    AAS: `
      <label>Angle A (deg): <input type="number" id="angleA" /></label><br/>
      <label>Angle B (deg): <input type="number" id="angleB" /></label><br/>
      <label>Side c: <input type="number" id="sideC" /></label>`
  };
  triangleModalElements.inputs.innerHTML = inputs[method];
}

triangleModalElements.createBtn.addEventListener('click', () => {
  const method = triangleModalElements.method.value;
  let pts;

  if (method === 'SSS') {
    const errorContainer = document.getElementById('triangleError');
    const a = +sideA.value, b = +sideB.value, c = +sideC.value;
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
      <button id="closeErrorBtn" style="
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
document.getElementById('closeErrorBtn').addEventListener('click', () => {
  errorContainer.innerHTML = '';
});

        return;
    }
    const A = [0, 0], B = [c, 0];
    const angle = Math.acos((a * a + c * c - b * b) / (2 * a * c));
    const C = [a * Math.cos(angle), a * Math.sin(angle)];
    pts = [A, B, C];
  } else if (method === 'SAS') {
    const a = +sideA.value, b = +sideB.value, angle = deg2rad(+angleC.value);
    pts = [[0, 0], [a, 0], [b * Math.cos(angle), b * Math.sin(angle)]];
  } else { // AAS
    const Aang = deg2rad(+angleA.value);
    const Bang = deg2rad(+angleB.value);
    const c = +sideC.value;
    const Cang = Math.PI - Aang - Bang;
    if (Cang <= 0) return alert('Bad AAS');
    const a = c * Math.sin(Aang) / Math.sin(Cang);
    const A = [0, 0], B = [c, 0];
    const angAtB = Math.PI - Bang;
    pts = [A, B, [a * Math.cos(angAtB), a * Math.sin(angAtB)]];
  }

  triangleModalElements.modal.style.display = 'none';
  drawTriangleOnCanvas(pts);
});

// === Triangle context menu ===
function isPointInsideTriangle(px, py, triangle, toCanvasCoords) {
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

const triangleContextMenu = document.getElementById('triangleContextMenu');
function hideTriangleContextMenu() {
  triangleContextMenu.style.display = 'none';
}

canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  selectedTriangle = triangles.find(tri =>
    isPointInsideTriangle(x, y, tri, toCanvasCoords));

  if (selectedTriangle) {
    triangleColorPicker.value = selectedTriangle.color;  // <-- sync color picker!
    triangleContextMenu.style.left = `${e.pageX}px`;
    triangleContextMenu.style.top = `${e.pageY}px`;
    triangleContextMenu.style.display = 'block';
  } else {
    hideTriangleContextMenu();
  }
});

document.getElementById('copyTriangle').addEventListener('click', () => {
  if (!selectedTriangle) return;
  pushUndo();
  const dx = 2, dy = 2;
  const newTri = new Triangle(
    [selectedTriangle.p1[0] + dx, selectedTriangle.p1[1] + dy],
    [selectedTriangle.p2[0] + dx, selectedTriangle.p2[1] + dy],
    [selectedTriangle.p3[0] + dx, selectedTriangle.p3[1] + dy],
    selectedTriangle.color
  );
  triangles.push(newTri);
  redraw();
  hideTriangleContextMenu();
});

document.getElementById('deleteTriangle').addEventListener('click', () => {
  if (!selectedTriangle) return;
  pushUndo();
  triangles = triangles.filter(t => t !== selectedTriangle);
  redraw();
  hideTriangleContextMenu();
});

// === Dragging and resizing triangles ===
canvas.addEventListener('mousedown', (e) => {
  hideTriangleContextMenu();
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  for (const tri of triangles) {
    const handleIndex = getHandleUnderMouse(x, y, tri, toCanvasCoords);
    if (handleIndex !== null) {
      selectedTriangle = tri;
      triangleColorPicker.value = selectedTriangle.color;
      isDragging = true;
      activeHandle = handleIndex;
      dragStartMouse = [x, y];
      triangleStartPoints = [ [...tri.p1], [...tri.p2], [...tri.p3] ];
      return;
    }

    if (isPointInsideTriangle(x, y, tri, toCanvasCoords)) {
      selectedTriangle = tri;
      triangleColorPicker.value = selectedTriangle.color;
      isDragging = true;
      activeHandle = null;
      dragStartMouse = [x, y];
      triangleStartPoints = [ [...tri.p1], [...tri.p2], [...tri.p3] ];
      return;
    }
    if (getRotationHandleUnderMouse(x, y, tri, toCanvasCoords)) {
        selectedTriangle = tri;
        triangleColorPicker.value = selectedTriangle.color;
        isDragging = true;
        rotating = true;
        dragStartMouse = [x, y];
        initialRotation = tri.rotation;
        return;
    }
  }
  selectedTriangle = null;
});

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  let hoveringHandle = false;
  for (const tri of triangles) {
    // Check if hovering rotation handle
    if (getRotationHandleUnderMouse(x, y, tri, toCanvasCoords)) {
        canvas.style.cursor = 'crosshair'; // or 'grab', whatever you prefer
        hoveringHandle = true;
        break;
    }
    if (getHandleUnderMouse(x, y, tri, toCanvasCoords) !== null) {
      canvas.style.cursor = 'nwse-resize'; // show resize cursor immediately on hover
      hoveringHandle = true;
      break;
    }
  }

  if (!hoveringHandle) {
    if (triangles.some(tri => isPointInsideTriangle(x, y, tri, toCanvasCoords))) {
      canvas.style.cursor = 'move'; // show move cursor when hovering inside triangle but not on handle
    } else if (!isDragging) {
      canvas.style.cursor = 'default'; // default cursor outside triangles/handles
    }
  }

  // Only drag if currently dragging a triangle or handle
  if (!isDragging || !selectedTriangle) return;
  if (rotating) {
  const [cx, cy] = toCanvasCoords(...selectedTriangle.getCenter());
  const angleStart = Math.atan2(dragStartMouse[1] - cy, dragStartMouse[0] - cx);
  const angleNow = Math.atan2(y - cy, x - cx);
  const deltaAngle = angleNow - angleStart;
  selectedTriangle.rotation = initialRotation + deltaAngle;
  redraw();
  return;
}

  const dx = (x - dragStartMouse[0]) / scale;
  const dy = -(y - dragStartMouse[1]) / scale;

  if (activeHandle !== null) {
    selectedTriangle[`p${activeHandle + 1}`] = [
      triangleStartPoints[activeHandle][0] + dx,
      triangleStartPoints[activeHandle][1] + dy
    ];
  } else {
    selectedTriangle.p1 = [triangleStartPoints[0][0] + dx, triangleStartPoints[0][1] + dy];
    selectedTriangle.p2 = [triangleStartPoints[1][0] + dx, triangleStartPoints[1][1] + dy];
    selectedTriangle.p3 = [triangleStartPoints[2][0] + dx, triangleStartPoints[2][1] + dy];
  }

  redraw();
});

canvas.addEventListener('mouseup', () => {
  if (isDragging) pushUndo();
  isDragging = false;
//   selectedTriangle = null;
  triangleStartPoints = null;
  dragStartMouse = null;
  activeHandle = null;
  rotating = false;
  canvas.style.cursor = 'default';
});

const triangleColorPicker = document.getElementById('triangleColorPicker');

// When you create a new triangle:
function drawTriangleOnCanvas(points) {
  pushUndo();
  triangles.push(new Triangle(points[0], points[1], points[2], triangleColorPicker.value));
  redraw();
}
triangleColorPicker.addEventListener('input', () => {
  if (selectedTriangle) {
    pushUndo();
    selectedTriangle.color = triangleColorPicker.value;
    redraw();
  }
});
