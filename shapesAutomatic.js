// Triangle Creation UI
const createTriangleBtnAutomatic = document.getElementById('drawTriangleAutomaticBtn');
const triangleInputContainerAutomatic = document.getElementById('triangleModalAutomatic');
const triangleTypeAutomatic = document.getElementById('triangleMethodAutomatic');
const confirmTriangleBtnAutomatic = document.getElementById('createTriangleAutomaticBtn');
const cancelTriangleBtnAutomatic = document.getElementById('cancelTriangleAutomaticBtn');

// Create input containers
const triangleInputsAutomatic = document.getElementById('triangleInputsAutomatic');
triangleInputsAutomatic.innerHTML = `
  <div id="sssInputs">
    Side 1: <input type="number" id="side1Automatic" min="0.01" step="0.01"><br>
    Side 2: <input type="number" id="side2Automatic" min="0.01" step="0.01"><br>
    Side 3: <input type="number" id="side3Automatic" min="0.01" step="0.01">
  </div>
  <div id="sasInputsAutomatic" style="display: none;">
    Side 1: <input type="number" id="sasSide1Automatic" min="0.01" step="0.01"><br>
    Angle: <input type="number" id="sasAngleAutomatic" min="1" max="179" step="1">°<br>
    Side 2: <input type="number" id="sasSide2Automatic" min="0.01" step="0.01">
  </div>
  <div id="asaInputsAutomatic" style="display: none;">
    Angle 1: <input type="number" id="asaAngle1Automatic" min="1" max="178" step="1">°<br>
    Side: <input type="number" id="asaSideAutomatic" min="0.01" step="0.01"><br>
    Angle 2: <input type="number" id="asaAngle2Automatic" min="1" max="178" step="1">°
  </div>
  <p style="font-size: 0.8em; color: #666;">Note: The program can only handle homogeneous triangles (all triangles will be identical).</p>
`;

// Event Listeners
triangleTypeAutomatic.addEventListener('change', (e) => {
  document.getElementById('sssInputs').style.display = 'none';
  document.getElementById('sasInputsAutomatic').style.display = 'none';
  document.getElementById('asaInputsAutomatic').style.display = 'none';
  
  if (e.target.value === 'SSS') {
    document.getElementById('sssInputs').style.display = 'block';
  } else if (e.target.value === 'SAS') {
    document.getElementById('sasInputsAutomatic').style.display = 'block';
  } else if (e.target.value === 'AAS') {
    document.getElementById('asaInputsAutomatic').style.display = 'block';
  }
});

createTriangleBtnAutomatic.addEventListener('click', () => {
  if (!spaceOptRectAutomatic) {
    alert("Please create a rectangle first using the space optimization button.");
    return;
  }
  triangleInputContainerAutomatic.style.display = 'block';
});

cancelTriangleBtnAutomatic.addEventListener('click', () => {
  triangleInputContainerAutomatic.style.display = 'none';
});

confirmTriangleBtnAutomatic.addEventListener('click', () => {
  const type = triangleTypeAutomatic.value;
  let triangle;
  
  try {
    if (type === 'SSS') {
      const a = parseFloat(document.getElementById('side1Automatic').value);
      const b = parseFloat(document.getElementById('side2Automatic').value);
      const c = parseFloat(document.getElementById('side3Automatic').value);
      
      if (a + b <= c || a + c <= b || b + c <= a) {
        throw new Error("Invalid triangle: sum of any two sides must be greater than the third side.");
      }
      
      triangle = createTriangleFromSSS(a, b, c);
    } 
    else if (type === 'SAS') {
      const a = parseFloat(document.getElementById('sasSide1Automatic').value);
      const angle = parseFloat(document.getElementById('sasAngleAutomatic').value) * Math.PI / 180;
      const b = parseFloat(document.getElementById('sasSide2Automatic').value);
      
      if (angle <= 0 || angle >= Math.PI) {
        throw new Error("Angle must be between 1° and 179°.");
      }
      
      triangle = createTriangleFromSAS(a, angle, b);
    }
    else if (type === 'AAS') {
      const angle1 = parseFloat(document.getElementById('asaAngle1Automatic').value) * Math.PI / 180;
      const side = parseFloat(document.getElementById('asaSideAutomatic').value);
      const angle2 = parseFloat(document.getElementById('asaAngle2Automatic').value) * Math.PI / 180;
      
      if (angle1 + angle2 >= 180 * Math.PI / 180) {
        throw new Error("Sum of the two angles must be less than 180°.");
      }
      
      triangle = createTriangleFromASA(angle1, side, angle2);
    }
    
    // Pack triangles into the rectangle
    packTrianglesInRectangle(triangle);
    
    triangleInputContainerAutomatic.style.display = 'none';
  } catch (error) {
    alert(error.message);
  }
});

// Triangle Creation Functions
function createTriangleFromSSS(a, b, c) {
  // Calculate angles using law of cosines
  const alpha = Math.acos((b*b + c*c - a*a) / (2*b*c));
  const beta = Math.acos((a*a + c*c - b*b) / (2*a*c));
  
  // Create triangle with point A at (0,0), point B at (c,0), and point C calculated
  const Ax = 0, Ay = 0;
  const Bx = c, By = 0;
  const Cx = b * Math.cos(alpha);
  const Cy = b * Math.sin(alpha);
  
  return {
    points: [[Ax, Ay], [Bx, By], [Cx, Cy]],
    sides: [a, b, c].sort((x,y) => x-y),
    angles: [alpha, beta, Math.PI - alpha - beta],
    isRight: Math.abs(a*a + b*b - c*c) < 0.0001
  };
}

function createTriangleFromSAS(a, angle, b) {
  // Third side using law of cosines
  const c = Math.sqrt(a*a + b*b - 2*a*b*Math.cos(angle));
  
  // Create triangle with point A at (0,0), point B at (b,0), and point C calculated
  const Ax = 0, Ay = 0;
  const Bx = b, By = 0;
  const Cx = a * Math.cos(angle);
  const Cy = a * Math.sin(angle);
  
  return {
    points: [[Ax, Ay], [Bx, By], [Cx, Cy]],
    sides: [a, b, c].sort((x,y) => x-y),
    angles: [angle, Math.acos((a*a + c*c - b*b) / (2*a*c)), Math.PI - angle - Math.acos((a*a + c*c - b*b) / (2*a*c))],
    isRight: Math.abs(angle - Math.PI/2) < 0.01 || 
             Math.abs(Math.acos((a*a + c*c - b*b) / (2*a*c)) - Math.PI/2) < 0.01 ||
             Math.abs(Math.PI - angle - Math.acos((a*a + c*c - b*b) / (2*a*c)) - Math.PI/2) < 0.01
  };
}

function createTriangleFromASA(angle1, side, angle2) {
  // Calculate third angle
  const angle3 = Math.PI - angle1 - angle2;
  
  // Calculate other sides using law of sines
  const a = side * Math.sin(angle1) / Math.sin(angle3);
  const b = side * Math.sin(angle2) / Math.sin(angle3);
  const c = side;
  
  return {
    points: [[0, 0], [side, 0], [b * Math.cos(angle1), b * Math.sin(angle1)]],
    sides: [a, b, c].sort((x,y) => x-y),
    angles: [angle1, angle2, angle3],
    isRight: Math.abs(angle1 - Math.PI/2) < 0.01 || 
             Math.abs(angle2 - Math.PI/2) < 0.01 ||
             Math.abs(angle3 - Math.PI/2) < 0.01
  };
}

// Advanced Packing Functions
function packTrianglesInRectangle(triangle) {
  if (!spaceOptRectAutomatic) return;

  if (triangle.isRight) {
    console.log("Optimizing right triangle packing...");
    optimizeRightTrianglePacking(triangle);
  } else {
    console.log("Using generic triangle packing...");
    genericTrianglePacking(triangle);
  }
}

function optimizeRightTrianglePacking(triangle) {
  const rectWidth = spaceOptRectAutomatic.width;
  const rectHeight = spaceOptRectAutomatic.height;

  const sides = triangle.sides?.slice().sort((a, b) => a - b); // a ≤ b ≤ c
  if (!sides || sides.length !== 3) {
    alert("Invalid triangle.");
    return;
  }

  const [a, b, c] = sides;
  if (Math.abs(a ** 2 + b ** 2 - c ** 2) > 0.01) {
    alert("This is not a right triangle.");
    return;
  }

  linesAutomatic = linesAutomatic.filter(item => !(item instanceof TriangleAutomatic));
  const color = document.getElementById('triangleColorPickerAutomatic').value;

  let totalTriangles = 0;

  function isInBounds(tri) {
    return tri.every(([x, y]) => x >= 0 && y >= 0 && x <= rectWidth && y <= rectHeight);
  }

  function drawPair(x, y, width, height) {
    const A = [x, y];
    const B = [x + width, y];
    const C = [x, y + height];
    const T1 = [A, B, C];

    if (!isInBounds(T1)) return false;
    linesAutomatic.push(new TriangleAutomatic(...A, ...B, ...C, color, false));
    totalTriangles++;

    const A2 = [x + width, y + height];
    const B2 = [x, y + height];
    const C2 = [x + width, y];
    const T2 = [A2, B2, C2];

    if (!isInBounds(T2)) return false;
    linesAutomatic.push(new TriangleAutomatic(...A2, ...B2, ...C2, color, true));
    totalTriangles++;
    return true;
  }

  function drawSingle(x, y, width, height, mirrored = false) {
    const tri = mirrored
      ? [
          [x + width, y + height],
          [x, y + height],
          [x + width, y]
        ]
      : [
          [x, y],
          [x + width, y],
          [x, y + height]
        ];
    if (!isInBounds(tri)) return false;
    linesAutomatic.push(new TriangleAutomatic(...tri[0], ...tri[1], ...tri[2], color, mirrored));
    totalTriangles++;
    return true;
  }

  // Strategy 1: Pack with (a × b) blocks
  let fullCols1 = Math.floor(rectWidth / a);
  let fullRows1 = Math.floor(rectHeight / b);
  let area1 = fullCols1 * fullRows1 * 2;

  // Strategy 2: Pack with (b × a) blocks (rotated)
  let fullCols2 = Math.floor(rectWidth / b);
  let fullRows2 = Math.floor(rectHeight / a);
  let area2 = fullCols2 * fullRows2 * 2;

  const useFirst = area1 >= area2;
  const primaryW = useFirst ? a : b;
  const primaryH = useFirst ? b : a;
  const fullCols = useFirst ? fullCols1 : fullCols2;
  const fullRows = useFirst ? fullRows1 : fullRows2;

  // Fill full grid of mirrored triangle pairs
  for (let y = 0; y < fullRows * primaryH; y += primaryH) {
    for (let x = 0; x < fullCols * primaryW; x += primaryW) {
      drawPair(x, y, primaryW, primaryH);
    }
  }

  const usedW = fullCols * primaryW;
  const usedH = fullRows * primaryH;
  const remW = rectWidth - usedW;
  const remH = rectHeight - usedH;

  // Try to fill leftover vertical strip on the right
  const tryRotW = primaryW === a ? b : a;
  const tryRotH = primaryH === b ? a : b;
  if (remW >= tryRotW) {
    for (let y = 0; y + tryRotH <= rectHeight; y += tryRotH) {
      drawPair(usedW, y, tryRotW, tryRotH);
    }
  }

  // Try to fill leftover horizontal strip on the bottom
  if (remH >= tryRotH) {
    for (let x = 0; x + tryRotW <= rectWidth; x += tryRotW) {
      drawPair(x, usedH, tryRotW, tryRotH);
    }
  }

  pushUndoAutomatic();
  redrawAutomatic();
  console.log(`Packed ${totalTriangles} triangles`);
  alert(`Packed ${totalTriangles} triangles (${rectWidth}×${rectHeight}) using mirrored hypotenuse-pairing`);
}

function genericTrianglePacking(triangle) {
  const triPoints = triangle.points;
  const minX = Math.min(...triPoints.map(p => p[0]));
  const maxX = Math.max(...triPoints.map(p => p[0]));
  const minY = Math.min(...triPoints.map(p => p[1]));
  const maxY = Math.max(...triPoints.map(p => p[1]));
  
  const triWidth = maxX - minX;
  const triHeight = maxY - minY;

  const cols = Math.floor(spaceOptRectAutomatic.width / triWidth);
  const rows = Math.floor(spaceOptRectAutomatic.height / triHeight);

  linesAutomatic = linesAutomatic.filter(item => !(item instanceof TriangleAutomatic));

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const xOffset = spaceOptRectAutomatic.x + col * triWidth;
      const yOffset = spaceOptRectAutomatic.y + row * triHeight;
      
      const newTriangle = new TriangleAutomatic(
        xOffset + triPoints[0][0] - minX, 
        yOffset + triPoints[0][1] - minY,
        xOffset + triPoints[1][0] - minX,
        yOffset + triPoints[1][1] - minY,
        xOffset + triPoints[2][0] - minX,
        yOffset + triPoints[2][1] - minY,
        document.getElementById('triangleColorPickerAutomatic').value
      );
      
      linesAutomatic.push(newTriangle);
    }
  }

  pushUndoAutomatic();
  redrawAutomatic();
  console.log(`Packed ${rows * cols} generic triangles`);
}

// Triangle Class
class TriangleAutomatic {
  constructor(x1, y1, x2, y2, x3, y3, color = '#FF0000') {
    this.x1 = x1; this.y1 = y1;
    this.x2 = x2; this.y2 = y2;
    this.x3 = x3; this.y3 = y3;
    this.color = color;
  }
  
  draw(ctx, toCanvasCoords) {
    const [cx1, cy1] = toCanvasCoords(this.x1, this.y1);
    const [cx2, cy2] = toCanvasCoords(this.x2, this.y2);
    const [cx3, cy3] = toCanvasCoords(this.x3, this.y3);

    ctx.fillStyle = this.color + '80';
    ctx.beginPath();
    ctx.moveTo(cx1, cy1);
    ctx.lineTo(cx2, cy2);
    ctx.lineTo(cx3, cy3);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Debug vertices
    ctx.fillStyle = 'blue';
    [cx1, cx2, cx3].forEach((x, i) => {
      ctx.beginPath();
      ctx.arc(x, [cy1, cy2, cy3][i], 3, 0, Math.PI*2);
      ctx.fill();
    });
  }
  
  clone() {
    return new TriangleAutomatic(this.x1, this.y1, this.x2, this.y2, this.x3, this.y3, this.color);
  }
}