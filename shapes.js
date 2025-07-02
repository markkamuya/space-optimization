// === Add at top of your script ===
let triangles = [];
let selectedTriangle = null;
let isDragging = false;
let triangleStartPoints = null;
let dragStartMouse = null;

class Triangle {
  constructor(p1, p2, p3, color) {
    this.p1 = p1;
    this.p2 = p2;
    this.p3 = p3;
    this.color = color;
    this.isLocked = true;
  }

  draw(ctx, toCanvasCoords) {
    const [c1x, c1y] = toCanvasCoords(...this.p1);
    const [c2x, c2y] = toCanvasCoords(...this.p2);
    const [c3x, c3y] = toCanvasCoords(...this.p3);
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
  }
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
    const a = +sideA.value, b = +sideB.value, c = +sideC.value;
    if (a + b <= c || a + c <= b || b + c <= a) return alert('Bad SSS');
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
  const dx = 10, dy = 10;
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

// === Dragging triangles ===
canvas.addEventListener('mousedown', (e) => {
  hideTriangleContextMenu();
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  for (const tri of triangles) {
    if (isPointInsideTriangle(x, y, tri, toCanvasCoords)) {
      selectedTriangle = tri;
      isDragging = true;
      dragStartMouse = [x, y];
      triangleStartPoints = [ [...tri.p1], [...tri.p2], [...tri.p3] ];
      break;
    }
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (!isDragging || !selectedTriangle) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const dx = (x - dragStartMouse[0]) / scale;
  const dy = -(y - dragStartMouse[1]) / scale;

  selectedTriangle.p1 = [triangleStartPoints[0][0] + dx, triangleStartPoints[0][1] + dy];
  selectedTriangle.p2 = [triangleStartPoints[1][0] + dx, triangleStartPoints[1][1] + dy];
  selectedTriangle.p3 = [triangleStartPoints[2][0] + dx, triangleStartPoints[2][1] + dy];

  redraw();
});

canvas.addEventListener('mouseup', () => {
  if (isDragging) pushUndo();
  isDragging = false;
  selectedTriangle = null;
  triangleStartPoints = null;
  dragStartMouse = null;
});
