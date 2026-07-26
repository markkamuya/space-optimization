import { DEFAULT_PROBLEM, normalizeProblem, serializableProblem } from './core/problem.js';
import { exportDXF, exportJSON, exportSVG } from './core/export.js';
import { renderChart, renderPacking } from './rendering/canvas.js';
import { solveAnnealing } from './solvers/annealing.js';
import { solveGreedy } from './solvers/greedy.js';

const $ = selector => document.querySelector(selector);
const elements = {
  name: $('#problem-name'),
  width: $('#width'),
  height: $('#height'),
  margin: $('#margin'),
  kerf: $('#kerf'),
  fillSheet: $('#fill-sheet'),
  maxPieces: $('#max-pieces'),
  rotation: $('#rotation'),
  reflection: $('#reflection'),
  seed: $('#seed'),
  iterations: $('#iterations'),
  triangleList: $('#triangle-list'),
  run: $('#run'),
  cancel: $('#cancel'),
  status: $('#status'),
  progress: $('#progress'),
  greedyCanvas: $('#greedy-canvas'),
  annealingCanvas: $('#annealing-canvas'),
  chart: $('#chart')
};

let triangleDefinitions = DEFAULT_PROBLEM.triangles.map(item => ({ ...item, sides: [...item.sides] }));
let currentProblem;
let greedyResult;
let optimizedResult;
let controller;

function renderTriangleInputs() {
  elements.triangleList.replaceChildren();
  triangleDefinitions.forEach((definition, index) => {
    const row = document.createElement('div');
    row.className = 'triangle-row';
    row.style.setProperty('--piece-color', definition.color);
    row.innerHTML = `
      <i aria-hidden="true"></i>
      <b>${definition.id}</b>
      <input aria-label="Triangle ${definition.id} side lengths" value="${definition.sides.join(', ')}">
      <button type="button" aria-label="Remove triangle ${definition.id}">×</button>
    `;
    row.querySelector('input').addEventListener('change', event => {
      definition.sides = event.target.value.split(',').map(value => Number(value.trim()));
    });
    row.querySelector('button').addEventListener('click', () => {
      triangleDefinitions.splice(index, 1);
      renderTriangleInputs();
    });
    elements.triangleList.append(row);
  });
  $('#hero-count').textContent = String(triangleDefinitions.length).padStart(2, '0');
}

function readProblem() {
  return normalizeProblem({
    name: elements.name.value,
    width: elements.width.value,
    height: elements.height.value,
    margin: elements.margin.value,
    kerf: elements.kerf.value,
    fillSheet: elements.fillSheet.checked,
    maxPieces: elements.maxPieces.value,
    allowRotation: elements.rotation.checked,
    allowReflection: elements.reflection.checked,
    seed: elements.seed.value,
    triangles: triangleDefinitions
  });
}

function metricMarkup(result) {
  if (!result) return '';
  return [
    ['Envelope fill', `${(result.metrics.envelopeUtilization * 100).toFixed(1)}%`],
    ['Sheet usage', `${(result.metrics.utilization * 100).toFixed(1)}%`],
    ['Runtime', `${result.elapsedMs.toFixed(0)} ms`]
  ].map(([label, value]) => `<div class="metric"><span>${label}</span><b>${value}</b></div>`).join('');
}

function showResult(prefix, result) {
  $(`#${prefix}-valid`).textContent = result.metrics.valid ? '✓ Valid' : '△ Violations';
  $(`#${prefix}-valid`).style.color = result.metrics.valid ? '#178448' : '#b33a1f';
  $(`#${prefix}-metrics`).innerHTML = metricMarkup(result);
}

function renderAll() {
  if (!currentProblem || !greedyResult || !optimizedResult) return;
  renderPacking(elements.greedyCanvas, greedyResult.problem ?? currentProblem, greedyResult);
  renderPacking(elements.annealingCanvas, optimizedResult.problem ?? currentProblem, optimizedResult);
  renderChart(elements.chart, optimizedResult.history);
}

async function runStudy() {
  try {
    currentProblem = readProblem();
  } catch (error) {
    elements.status.textContent = error.message;
    return;
  }
  controller?.abort();
  controller = new AbortController();
  elements.run.disabled = true;
  elements.cancel.disabled = false;
  elements.progress.value = 0;
  $('#study-title').textContent = currentProblem.name;
  elements.status.textContent = 'Building deterministic baseline…';

  greedyResult = solveGreedy(currentProblem);
  optimizedResult = { ...greedyResult, solver: 'annealing', history: [] };
  showResult('greedy', greedyResult);
  showResult('annealing', optimizedResult);
  renderAll();

  try {
    elements.status.textContent = 'Trying compact piece orders and orientation phases…';
    optimizedResult = await solveAnnealing(currentProblem, {
      iterations: Number(elements.iterations.value),
      signal: controller.signal,
      onProgress({ iteration, iterations, state, metrics, problem }) {
        elements.progress.value = iteration / iterations * 100;
        optimizedResult = { ...optimizedResult, state, metrics, problem };
        if (iteration % Math.max(1, Math.floor(iterations / 10)) === 0) {
          renderPacking(elements.annealingCanvas, optimizedResult.problem ?? currentProblem, optimizedResult);
        }
      }
    });
    showResult('annealing', optimizedResult);
    const improvement = (greedyResult.metrics.score - optimizedResult.metrics.score) /
      Math.max(1, greedyResult.metrics.score) * 100;
    $('#improvement').textContent = `${Math.max(0, improvement).toFixed(1)}% lower score`;
    elements.status.textContent = optimizedResult.metrics.valid
      ? `Best valid layout found in ${optimizedResult.elapsedMs.toFixed(0)} ms.`
      : 'Best-known layout still has constraint violations; try more iterations or a larger sheet.';
    elements.progress.value = 100;
    renderAll();
  } catch (error) {
    elements.status.textContent = error.name === 'AbortError' ? 'Run cancelled.' : error.message;
  } finally {
    elements.run.disabled = false;
    elements.cancel.disabled = true;
  }
}

function applyProblem(input) {
  const source = input.problem ?? input;
  elements.name.value = source.name;
  elements.width.value = source.width;
  elements.height.value = source.height;
  elements.margin.value = source.margin;
  elements.kerf.value = source.kerf;
  elements.fillSheet.checked = source.fillSheet !== false;
  elements.maxPieces.value = source.maxPieces ?? 120;
  elements.rotation.checked = source.allowRotation !== false;
  elements.reflection.checked = source.allowReflection === true;
  elements.seed.value = source.seed;
  triangleDefinitions = source.triangles.map(item => ({
    id: item.id,
    sides: [...item.sides],
    color: item.color
  }));
  renderTriangleInputs();
  runStudy();
}

$('#add-triangle').addEventListener('click', () => {
  const index = triangleDefinitions.length;
  const colors = ['#f97316', '#22c55e', '#38bdf8', '#a78bfa', '#fb7185', '#facc15'];
  triangleDefinitions.push({
    id: String.fromCharCode(65 + index),
    sides: [3, 4, 5],
    color: colors[index % colors.length]
  });
  renderTriangleInputs();
});
elements.run.addEventListener('click', runStudy);
elements.cancel.addEventListener('click', () => controller?.abort());
$('#load-example').addEventListener('click', () => applyProblem(serializableProblem(normalizeProblem(DEFAULT_PROBLEM))));
$('#import-json').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    applyProblem(JSON.parse(await file.text()));
  } catch (error) {
    elements.status.textContent = `Could not import file: ${error.message}`;
  }
  event.target.value = '';
});
document.querySelectorAll('[data-export]').forEach(button => {
  button.addEventListener('click', () => {
    if (!currentProblem || !optimizedResult) return;
    const exporters = { svg: exportSVG, dxf: exportDXF, json: exportJSON };
    exporters[button.dataset.export](optimizedResult.problem ?? currentProblem, optimizedResult);
  });
});
window.addEventListener('resize', () => requestAnimationFrame(renderAll));

renderTriangleInputs();
runStudy();
