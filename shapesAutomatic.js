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
  const [a, b, c] = triangle.sides; // Sorted, a ≤ b ≤ c
  
  // Strategy 1: Basic grid packing
  const basicGridCount = Math.floor(rectWidth / b) * Math.floor(rectHeight / a);
  
  // Strategy 2: Rotated 90 degrees
  const rotatedGridCount = Math.floor(rectWidth / a) * Math.floor(rectHeight / b);
  
  // Strategy 3: Pairwise mirrored packing (forms rectangles)
  const pairwiseCount = 2 * Math.floor(rectWidth / (a + b)) * Math.floor(rectHeight / b);
  
  // Strategy 4: Mixed orientation packing
  const mixedCount = (Math.floor(rectHeight / (a + b)) * Math.floor(rectWidth / b)) +
                    (Math.floor(rectWidth / (a + b)) * Math.floor(rectHeight / b));
  
  // Find best strategy
  const bestCount = Math.max(basicGridCount, rotatedGridCount, pairwiseCount, mixedCount);
  
  // Clear existing triangles
  linesAutomatic = linesAutomatic.filter(item => !(item instanceof TriangleAutomatic));
  
  // Implement best strategy
  if (bestCount === basicGridCount) {
    packBasicRightTriangles(a, b, false);
  } else if (bestCount === rotatedGridCount) {
    packBasicRightTriangles(b, a, true);
  } else if (bestCount === pairwiseCount) {
    packPairwiseRightTriangles(a, b);
  } else {
    packMixedRightTriangles(a, b);
  }
  
  pushUndoAutomatic();
  redrawAutomatic();
  console.log(`Packed ${bestCount} right triangles`);
}

function packBasicRightTriangles(shortLeg, longLeg, rotated) {
  const cols = Math.floor(spaceOptRectAutomatic.width / (rotated ? shortLeg : longLeg));
  const rows = Math.floor(spaceOptRectAutomatic.height / (rotated ? longLeg : shortLeg));
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = spaceOptRectAutomatic.x + col * (rotated ? shortLeg : longLeg);
      const y = spaceOptRectAutomatic.y + row * (rotated ? longLeg : shortLeg);
      
      if (rotated) {
        linesAutomatic.push(new TriangleAutomatic(
          x, y,
          x, y + shortLeg,
          x + longLeg, y,
          document.getElementById('triangleColorPickerAutomatic').value
        ));
      } else {
        linesAutomatic.push(new TriangleAutomatic(
          x, y,
          x + longLeg, y,
          x, y + shortLeg,
          document.getElementById('triangleColorPickerAutomatic').value
        ));
      }
    }
  }
}

function packPairwiseRightTriangles(shortLeg, longLeg) {
  const pairWidth = shortLeg + longLeg;
  const cols = Math.floor(spaceOptRectAutomatic.width / pairWidth);
  const rows = Math.floor(spaceOptRectAutomatic.height / longLeg);
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = spaceOptRectAutomatic.x + col * pairWidth;
      const y = spaceOptRectAutomatic.y + row * longLeg;
      
      // First triangle
      linesAutomatic.push(new TriangleAutomatic(
        x, y,
        x + longLeg, y,
        x, y + shortLeg,
        document.getElementById('triangleColorPickerAutomatic').value
      ));
      
      // Mirrored triangle
      linesAutomatic.push(new TriangleAutomatic(
        x + longLeg, y,
        x + pairWidth, y,
        x + longLeg, y + shortLeg,
        document.getElementById('triangleColorPickerAutomatic').value
      ));
    }
  }
}

function packMixedRightTriangles(shortLeg, longLeg) {
  // Vertical stripe of horizontal triangles
  const vertCols = Math.floor(spaceOptRectAutomatic.width / longLeg);
  const vertRows = Math.floor(spaceOptRectAutomatic.height / (shortLeg + longLeg));
  
  // Horizontal stripe of vertical triangles
  const horizRows = Math.floor(spaceOptRectAutomatic.height / longLeg);
  const horizCols = Math.floor(spaceOptRectAutomatic.width / (shortLeg + longLeg));
  
  // Pack vertical stripe
  for (let row = 0; row < vertRows; row++) {
    for (let col = 0; col < vertCols; col++) {
      const x = spaceOptRectAutomatic.x + col * longLeg;
      const y = spaceOptRectAutomatic.y + row * (shortLeg + longLeg);
      
      linesAutomatic.push(new TriangleAutomatic(
        x, y,
        x + longLeg, y,
        x, y + shortLeg,
        document.getElementById('triangleColorPickerAutomatic').value
      ));
    }
  }
  
  // Pack horizontal stripe
  for (let row = 0; row < horizRows; row++) {
    for (let col = 0; col < horizCols; col++) {
      const x = spaceOptRectAutomatic.x + col * (shortLeg + longLeg);
      const y = spaceOptRectAutomatic.y + row * longLeg;
      
      linesAutomatic.push(new TriangleAutomatic(
        x, y,
        x, y + longLeg,
        x + shortLeg, y,
        document.getElementById('triangleColorPickerAutomatic').value
      ));
    }
  }
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