function rotatePoint(px, py, angle) {
  return {
    x: px * Math.cos(angle) - py * Math.sin(angle),
    y: px * Math.sin(angle) + py * Math.cos(angle),
  };
}

function transformTriangle(baseTriangle, x, y, angle) {
  return baseTriangle.map(p => {
    const r = rotatePoint(p.x, p.y, angle);
    return { x: r.x + x, y: r.y + y };
  });
}

function triangleArea(tri) {
  const [A, B, C] = tri;
  return 0.5 * Math.abs(
    A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y)
  );
}
function doPolygonsOverlap(polyA, polyB) {
  function project(polygon, axis) {
    const dots = polygon.map(p => p.x * axis.x + p.y * axis.y);
    return { min: Math.min(...dots), max: Math.max(...dots) };
  }

  function getAxes(polygon) {
    const axes = [];
    for (let i = 0; i < polygon.length; i++) {
      const p1 = polygon[i];
      const p2 = polygon[(i + 1) % polygon.length];
      const edge = { x: p2.x - p1.x, y: p2.y - p1.y };
      const normal = { x: -edge.y, y: edge.x };
      const length = Math.hypot(normal.x, normal.y);
      axes.push({ x: normal.x / length, y: normal.y / length });
    }
    return axes;
  }

  const axes = [...getAxes(polyA), ...getAxes(polyB)];

  for (const axis of axes) {
    const projA = project(polyA, axis);
    const projB = project(polyB, axis);
    if (projA.max < projB.min || projB.max < projA.min) {
      return false;
    }
  }

  return true;
}
async function runSimulatedAnnealing(triangleDefs, canvasWidth, canvasHeight) {
  const triangles = triangleDefs.map(t => generateTriangleFromDefinition(t));
  let state = triangles.map(() => ({
    x: Math.random() * canvasWidth,
    y: Math.random() * canvasHeight,
    angle: Math.random() * 2 * Math.PI,
  }));

  let temperature = 1.0;
  const cooling = 0.98;
  const T_MIN = 1e-3;

  function getCost(state) {
    let cost = 0;
    for (let i = 0; i < triangles.length; i++) {
      const triA = transformTriangle(triangles[i], state[i].x, state[i].y, state[i].angle);
      for (let j = i + 1; j < triangles.length; j++) {
        const triB = transformTriangle(triangles[j], state[j].x, state[j].y, state[j].angle);
        if (doPolygonsOverlap(triA, triB)) cost += 1000;
      }
      triA.forEach(p => {
        if (p.x < 0 || p.x > canvasWidth || p.y < 0 || p.y > canvasHeight) cost += 1000;
      });
    }
    return cost;
  }

  function perturb(state) {
    const next = JSON.parse(JSON.stringify(state));
    const idx = Math.floor(Math.random() * next.length);
    next[idx].x += (Math.random() - 0.5) * 20;
    next[idx].y += (Math.random() - 0.5) * 20;
    next[idx].angle += (Math.random() - 0.5) * 0.2;
    return next;
  }

  let best = [...state];
  let bestCost = getCost(state);

  while (temperature > T_MIN) {
    for (let i = 0; i < 100; i++) {
      const next = perturb(state);
      const delta = getCost(next) - getCost(state);
      if (delta < 0 || Math.random() < Math.exp(-delta / temperature)) {
        state = next;
        const nextCost = getCost(state);
        if (nextCost < bestCost) {
          best = next;
          bestCost = nextCost;
        }
      }
    }
    temperature *= cooling;
    await new Promise(resolve => setTimeout(resolve, 10)); // visual responsiveness
  }

  return { triangles, state: best };
}
function renderPackedTriangles(triangles, state, ctx) {
  ctx.clearRect(0, 0, 800, 800);
  for (let i = 0; i < triangles.length; i++) {
    const tri = transformTriangle(triangles[i], state[i].x, state[i].y, state[i].angle);
    ctx.beginPath();
    ctx.moveTo(tri[0].x, tri[0].y);
    ctx.lineTo(tri[1].x, tri[1].y);
    ctx.lineTo(tri[2].x, tri[2].y);
    ctx.closePath();
    ctx.fillStyle = '#'+Math.floor(Math.random()*16777215).toString(16);
    ctx.fill();
    ctx.stroke();
  }
}
document.getElementById("createHeteroTriangles").addEventListener("click", async () => {
  const triangles = [];
  document.querySelectorAll("#heteroTriangleInputsContainer > div").forEach(group => {
    const method = group.querySelector(".methodSelector").value;
    const values = [...group.querySelectorAll(".inputFields input")].map(i => parseFloat(i.value.trim()));
    triangles.push({ method, values });
  });

  document.getElementById("heteroTriangleEntryModal").style.display = "none";

  const canvas = document.getElementById("canvasAutomatic");
  const ctx = canvas.getContext("2d");

  const result = await runSimulatedAnnealing(triangles, canvas.width, canvas.height);
  renderPackedTriangles(result.triangles, result.state, ctx);
});
