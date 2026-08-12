import { ATLAS_RECORDS, OPEN_PROBLEMS, phaseAt } from './atlas/catalog.js';
import { normalizeProblem } from './core/problem.js';
import { renderPacking } from './rendering/canvas.js';

const $ = selector => document.querySelector(selector);
const percent = value => `${(value * 100).toFixed(1)}%`;
let familyFilter = 'all';
let selectedPhase = phaseAt(60, 1.5);
let researchRelease = null;
let canonicalRelease = null;
let researchLimit = 24;

$('#record-count').textContent = String(ATLAS_RECORDS.length).padStart(2, '0');
$('#open-count').textContent = String(OPEN_PROBLEMS.length).padStart(2, '0');

function drawPattern(canvas, angle, ratio, phase) {
  const context = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#f4f1e8';
  context.fillRect(0, 0, width, height);
  const padding = 32;
  const boxWidth = width - padding * 2;
  const boxHeight = Math.min(height - padding * 2, boxWidth / ratio);
  const x0 = (width - boxWidth) / 2;
  const y0 = (height - boxHeight) / 2;
  context.fillStyle = '#fffdf7';
  context.fillRect(x0, y0, boxWidth, boxHeight);
  context.save();
  context.beginPath();
  context.rect(x0, y0, boxWidth, boxHeight);
  context.clip();
  const radians = angle * Math.PI / 180;
  const base = Math.max(38, Math.min(76, boxWidth / 8));
  const triHeight = Math.max(22, base / 2 / Math.tan(radians / 2));
  let index = 0;
  for (let row = -1; row < boxHeight / triHeight + 2; row += 1) {
    for (let column = -2; column < boxWidth / base + 3; column += 1) {
      const x = x0 + column * base + (row % 2 ? base / 2 : 0);
      const y = y0 + row * triHeight;
      const down = (row + column) % 2 !== 0;
      context.beginPath();
      if (down) {
        context.moveTo(x, y);
        context.lineTo(x + base, y);
        context.lineTo(x + base / 2, y + triHeight);
      } else {
        context.moveTo(x + base / 2, y);
        context.lineTo(x + base, y + triHeight);
        context.lineTo(x, y + triHeight);
      }
      context.closePath();
      context.fillStyle = `${phase.color}${index % 3 === 0 ? 'd8' : 'a8'}`;
      context.fill();
      context.strokeStyle = '#14201c';
      context.lineWidth = 1.2;
      context.stroke();
      index += 1;
    }
  }
  context.restore();
  context.strokeStyle = '#14201c';
  context.lineWidth = 2;
  context.strokeRect(x0, y0, boxWidth, boxHeight);
}

function recordColor(record) {
  if (record.family === 'right') return '#ff6b35';
  if (record.family === 'equilateral') return '#3dd6b0';
  if (record.family === 'scalene') return '#5f8cff';
  if (record.pattern.includes('vertical')) return '#f5c451';
  if (record.pattern.includes('diagonal')) return '#bd8bff';
  return '#8e7be8';
}

function nearestComputed(angle, ratio) {
  if (!researchRelease) return null;
  return researchRelease.records
    .filter(record => record.family !== 'scalene')
    .map(record => ({
      record,
      distance: Math.hypot(
        (record.parameters.apexAngle - angle) / 75,
        (record.parameters.rectangleRatio - ratio) / 2.25
      )
    }))
    .sort((left, right) => left.distance - right.distance)[0];
}

function makePhaseMap() {
  const grid = $('#phase-grid');
  grid.replaceChildren();
  if (researchRelease) {
    const records = researchRelease.records.filter(record => record.family !== 'scalene');
    grid.style.gridTemplateColumns = `repeat(${researchRelease.sampling.rectangleRatios.length}, 1fr)`;
    records
      .sort((left, right) =>
        right.parameters.apexAngle - left.parameters.apexAngle ||
        left.parameters.rectangleRatio - right.parameters.rectangleRatio)
      .forEach(record => {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'phase-cell computed';
        cell.style.setProperty('--phase-color', recordColor(record));
        cell.style.setProperty('--confidence', Math.max(.45, 1 - record.bounds.optimalityGap));
        cell.title = `${record.parameters.apexAngle}°, ${record.parameters.rectangleRatio}:1 — ${record.pattern}, ${percent(record.verification.utilization)}`;
        cell.setAttribute('aria-label', cell.title);
        cell.addEventListener('click', () => {
          $('#angle').value = record.parameters.apexAngle;
          $('#ratio').value = record.parameters.rectangleRatio;
          updatePhase();
        });
        grid.append(cell);
      });
    $('#resolution-label').textContent = researchRelease.sampling.resolution;
    return;
  }
  const angles = [110, 95, 80, 65, 50, 35];
  const ratios = [0.75, 1.1, 1.5, 2, 2.5, 3];
  grid.style.gridTemplateColumns = 'repeat(6, 1fr)';
  for (const angle of angles) {
    for (const ratio of ratios) {
      const phase = phaseAt(angle, ratio);
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'phase-cell';
      cell.style.setProperty('--phase-color', phase.color);
      cell.title = `${angle}°, ${ratio}:1 — ${phase.name}`;
      cell.setAttribute('aria-label', cell.title);
      cell.addEventListener('click', () => {
        $('#angle').value = angle;
        $('#ratio').value = ratio;
        updatePhase();
      });
      grid.append(cell);
    }
  }
}

function updatePhase() {
  const angle = Number($('#angle').value);
  const ratio = Number($('#ratio').value);
  const nearest = nearestComputed(angle, ratio);
  selectedPhase = nearest
    ? {
        name: nearest.record.pattern,
        status: nearest.record.status.replaceAll('_', ' '),
        utilization: nearest.record.verification.utilization,
        color: recordColor(nearest.record),
        note: `${nearest.record.verification.pieceCount} pieces fit without overlap. Best method tested: ${nearest.record.solver.winner}.`
      }
    : phaseAt(angle, ratio);
  $('#angle-output').textContent = `${angle}°`;
  $('#ratio-output').textContent = `${ratio.toFixed(2)}:1`;
  $('#phase-name').textContent = selectedPhase.name;
  $('#phase-note').textContent = selectedPhase.note;
  $('#phase-status').textContent = selectedPhase.status;
  $('#phase-fill').textContent = percent(selectedPhase.utilization);
  $('#phase-waste').textContent = percent(1 - selectedPhase.utilization);
  $('#phase-gap').textContent = nearest ? percent(nearest.record.bounds.optimalityGap) : 'Not calculated';
  $('#phase-distance').textContent = nearest ? nearest.distance.toFixed(3) : 'Preview only';
  $('#phase-dot').style.background = selectedPhase.color;
  $('#live-label').textContent = `${angle}° / ${ratio.toFixed(2)}:1`;
  $('#used-bar').style.width = percent(selectedPhase.utilization);
  $('#used-bar').style.background = selectedPhase.color;
  $('#waste-bar').style.width = percent(1 - selectedPhase.utilization);
  drawPattern($('#live-canvas'), angle, ratio, selectedPhase);
}

function statusLabel(record) {
  if (record.status === 'proven_optimal') return 'PROVEN OPTIMUM';
  if (record.status === 'verified_construction') return 'VERIFIED';
  return record.status.replaceAll('_', ' ').toUpperCase();
}

function recordCard(record) {
  const article = document.createElement('article');
  article.className = 'record-card';
  article.dataset.family = record.family;
  article.innerHTML = `
    <div class="record-preview"><canvas width="540" height="340" aria-label="${record.title} packing"></canvas><span>${statusLabel(record)}</span></div>
    <div class="record-meta"><small>${record.family} · ${record.problem.width.toFixed(1)} × ${record.problem.height.toFixed(1)}</small><h3>${record.title}</h3>
      <dl><div><dt>Fill</dt><dd>${percent(record.verification.utilization)}</dd></div><div><dt>Pieces</dt><dd>${record.solution.placements.length}</dd></div><div><dt>Gap</dt><dd>${percent(record.verification.optimalityGap)}</dd></div></dl>
    </div>`;
  article.tabIndex = 0;
  article.setAttribute('role', 'button');
  article.addEventListener('click', () => openRecord(record));
  article.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') openRecord(record);
  });
  requestAnimationFrame(() => renderPacking(
    article.querySelector('canvas'),
    normalizeProblem(record.problem),
    { state: record.solution.placements }
  ));
  return article;
}

function renderRecords() {
  const grid = $('#record-grid');
  grid.replaceChildren();
  ATLAS_RECORDS
    .filter(record => familyFilter === 'all' || record.family === familyFilter)
    .forEach(record => grid.append(recordCard(record)));
}

function openRecord(record) {
  const detail = $('#record-detail');
  detail.innerHTML = `
    <div class="detail-header"><div><p class="kicker">${record.family} / ${statusLabel(record)}</p><h2>${record.title}</h2><p>${record.pattern}. Fingerprint <code>${record.verification.fingerprint}</code></p></div>
      <div class="detail-stat"><b>${percent(record.verification.utilization)}</b><span>verified fill</span></div></div>
    <canvas width="1000" height="560" aria-label="${record.title} detailed packing"></canvas>
    <div class="detail-grid">
      <section><h3>Filled and empty space</h3><div class="detail-waste"><span style="width:${percent(record.verification.utilization)}"></span><i style="width:${percent(1 - record.verification.utilization)}"></i></div>
        <dl><div><dt>Filled by triangles</dt><dd>${percent(record.verification.utilization)}</dd></div><div><dt>Empty space</dt><dd>${percent(1 - record.verification.utilization)}</dd></div><div><dt>Overlap</dt><dd>0.0%</dd></div></dl></section>
      <section><h3>How the result improved</h3><div class="timeline">${record.history.map(point => `<div><b style="height:${Math.max(8, point.utilization * 100)}%"></b><span>${point.year}</span><small>${percent(point.utilization)}</small></div>`).join('')}</div></section>
      <section><h3>Source and verification</h3><p>Created by <code>${record.provenance.generator}</code> and checked independently using the Atlas geometry rules.</p><a href="/atlas-v1.json" download>Download coordinates ↓</a></section>
    </div>`;
  const dialog = $('#record-dialog');
  dialog.showModal();
  requestAnimationFrame(() => renderPacking(
    detail.querySelector('canvas'),
    normalizeProblem(record.problem),
    { state: record.solution.placements }
  ));
}

function renderFilters() {
  const filters = $('#family-filters');
  ['all', 'right', 'equilateral', 'isosceles'].forEach(family => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = family;
    button.className = family === familyFilter ? 'active' : '';
    button.addEventListener('click', () => {
      familyFilter = family;
      renderFilters();
      renderRecords();
    });
    filters.append(button);
  });
}

function renderChallenges() {
  OPEN_PROBLEMS.forEach((problem, index) => {
    const article = document.createElement('article');
    article.innerHTML = `<span>OP-${String(index + 1).padStart(2, '0')}</span><small>${problem.family} · ${problem.difficulty}</small><h3>${problem.title}</h3><p>${problem.question}</p><b>${problem.shape} / ${problem.ratio}:1</b>`;
    $('#challenge-grid').append(article);
  });
}

function compare() {
  const left = ATLAS_RECORDS.find(record => record.id === $('#compare-a').value);
  const right = ATLAS_RECORDS.find(record => record.id === $('#compare-b').value);
  $('#comparison').innerHTML = [left, right].map(record => `
    <article><span>${statusLabel(record)}</span><h3>${record.title}</h3>
      <div class="comparison-bar"><i style="width:${percent(record.verification.utilization)}"></i></div>
      <dl><div><dt>Verified fill</dt><dd>${percent(record.verification.utilization)}</dd></div><div><dt>Boundary waste</dt><dd>${percent(1 - record.verification.utilization)}</dd></div><div><dt>Pattern</dt><dd>${record.pattern}</dd></div></dl>
    </article>`).join('');
}

function setupComparison() {
  for (const selector of ['#compare-a', '#compare-b']) {
    const select = $(selector);
    ATLAS_RECORDS.forEach(record => select.add(new Option(record.title, record.id)));
    select.addEventListener('change', compare);
  }
  $('#compare-b').selectedIndex = Math.min(ATLAS_RECORDS.length - 1, 4);
  compare();
}

function renderLeaderboard() {
  if (!researchRelease) return;
  const leaders = [...researchRelease.records]
    .sort((left, right) => right.verification.utilization - left.verification.utilization)
    .slice(0, 8);
  $('#leaderboard').innerHTML = leaders.map((record, index) => `
    <article><b>${String(index + 1).padStart(2, '0')}</b><div><small>${record.family} · ${record.parameters.apexAngle}° · ${record.parameters.rectangleRatio}:1</small><h3>${record.pattern}</h3><span>${record.provenance.contributor}</span></div>
      <strong>${percent(record.verification.utilization)}</strong><em>gap ${percent(record.bounds.optimalityGap)}</em></article>`).join('');
}

async function loadResearchRelease() {
  try {
    const response = await fetch('/atlas-v2.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    canonicalRelease = await response.json();
    researchRelease = {
      records: canonicalRelease.records,
      verifiedCount: canonicalRelease.coverage.verified,
      sampling: {
        rectangleRatios: [...new Set(canonicalRelease.records
          .filter(record => record.family !== 'scalene')
          .map(record => record.parameters.rectangleRatio))],
        resolution: `${canonicalRelease.coverage.records} canonical experiments`
      }
    };
    $('#record-count').textContent = String(researchRelease.verifiedCount);
    makePhaseMap();
    updatePhase();
    renderLeaderboard();
    renderResearchExplorer();
  } catch {
    $('#resolution-label').textContent = 'curated fallback';
    $('#research-result-count').textContent = 'The full dataset could not be loaded. Try refreshing the page.';
  }
}

function researchRecordLabel(record) {
  return record.family === 'scalene'
    ? `${record.family} · ${record.id.split('-r')[0]} · ${record.parameters.rectangleRatio}:1`
    : `${record.family} · ${record.parameters.apexAngle}° · ${record.parameters.rectangleRatio}:1`;
}

function filteredResearchRecords() {
  const query = $('#research-search').value.trim().toLowerCase();
  const family = $('#research-family').value;
  const evidence = $('#research-evidence').value;
  return canonicalRelease.records.filter(record => {
    if (family !== 'all' && record.family !== family) return false;
    if (evidence !== 'all' && record.evidence.state !== evidence) return false;
    const haystack = `${record.id} ${record.experimentId} ${record.family} ${record.pattern} ${record.evidence.state}`.toLowerCase();
    return !query || haystack.includes(query);
  });
}

function openResearchRecord(record) {
  const detail = $('#record-detail');
  detail.innerHTML = `
    <div class="detail-header"><div><p class="kicker">${record.family} / ${record.evidence.state.replaceAll('_', ' ')}</p><h2>${record.experimentId}</h2><p>${record.evidence.claim}</p></div>
      <div class="detail-stat"><b>${percent(record.verification.utilization)}</b><span>verified lower bound</span></div></div>
    <canvas width="1000" height="560" aria-label="${record.id} packing coordinates"></canvas>
    <div class="detail-grid">
      <section><h3>Verification certificate</h3><p><code>${record.verification.certificate}</code></p><dl><div><dt>Pieces</dt><dd>${record.verification.pieceCount}</dd></div><div><dt>Overlap</dt><dd>0</dd></div><div><dt>Verifier</dt><dd>${record.verification.verifier}</dd></div></dl></section>
      <section><h3>Best result and proven limit</h3><dl><div><dt>Verified fill</dt><dd>${percent(record.bounds.lowerBound)}</dd></div><div><dt>Proven maximum</dt><dd>${percent(record.bounds.upperBound)}</dd></div><div><dt>Room for improvement</dt><dd>${percent(record.bounds.optimalityGap)}</dd></div></dl><p>Priority for checking empty boundary space: ${record.descriptors.boundaryGapAnalysis.priority}.</p></section>
      <section><h3>Reproduce this result</h3><p><code>${record.reproducibility.command}</code></p><p>Seed <code>${record.reproducibility.seed}</code><br>Fingerprint <code>${record.verification.fingerprint}</code></p><a href="/atlas-v2.json" download>Download coordinates ↓</a></section>
    </div>`;
  $('#record-dialog').showModal();
  requestAnimationFrame(() => renderPacking(
    detail.querySelector('canvas'),
    normalizeProblem(record.problem),
    { state: record.solution.placements }
  ));
  history.replaceState(null, '', `#research?record=${encodeURIComponent(record.id)}`);
}

function renderResearchExplorer() {
  if (!canonicalRelease) return;
  const records = filteredResearchRecords();
  const visible = records.slice(0, researchLimit);
  $('#research-summary').innerHTML = [
    ['Verified records', canonicalRelease.coverage.verified],
    ['Proven controls', canonicalRelease.coverage.provenOptimal],
    ['Observed transitions', canonicalRelease.coverage.phaseTransitions],
    ['Adaptive improvements', canonicalRelease.coverage.adaptivelyImproved ?? 0],
    ['Open compute tasks', canonicalRelease.coverage.openDistributedTasks]
  ].map(([label, value]) => `<div><b>${value}</b><span>${label}</span></div>`).join('');
  $('#research-results').innerHTML = visible.map(record => `
    <button type="button" data-record="${record.id}">
      <span><b>${researchRecordLabel(record)}</b><small>${record.experimentId}</small></span>
      <span>${record.pattern}</span>
      <span><i class="${record.evidence.state}">${record.evidence.state.replaceAll('_', ' ')}</i></span>
      <span><b>${percent(record.verification.utilization)}</b><small>gap ${percent(record.bounds.optimalityGap)}</small></span>
    </button>`).join('');
  $('#research-results').querySelectorAll('[data-record]').forEach(button => {
    button.addEventListener('click', () =>
      openResearchRecord(canonicalRelease.records.find(record => record.id === button.dataset.record)));
  });
  $('#research-result-count').textContent = `Showing ${visible.length} of ${records.length} matching records`;
  $('#research-more').hidden = visible.length >= records.length;
  $('#transition-list').innerHTML = canonicalRelease.transitions.slice(0, 8).map(transition => `
    <article><b>${transition.apexAngle}°</b><span>${transition.betweenRatios.join('–')}:1</span><p>${transition.from} → ${transition.to}</p><small>${transition.evidence.join(' / ')}</small></article>`).join('') ||
    '<p>No pattern transition was observed at this sampling resolution.</p>';
  const match = location.hash.match(/^#research\?record=([^&]+)/);
  if (match) {
    const record = canonicalRelease.records.find(item => item.id === decodeURIComponent(match[1]));
    if (record && !$('#record-dialog').open) openResearchRecord(record);
  }
}

async function loadV1Context() {
  try {
    const [auditResponse, literatureResponse, challengeResponse] = await Promise.all([
      fetch('/audit-v2.json'),
      fetch('/literature/registry.json'),
      fetch('/community-challenges-v2.json')
    ]);
    const audit = auditResponse.ok ? await auditResponse.json() : null;
    const literature = literatureResponse.ok ? await literatureResponse.json() : null;
    const challenges = challengeResponse.ok ? await challengeResponse.json() : null;
    if (audit) {
      $('#release-gates').innerHTML = [
        ['Canonical geometry replay', `${audit.summary.replayed}/${audit.summary.records} passed`, 'passed'],
        ['Critical audit findings', audit.summary.critical, audit.summary.critical === 0 ? 'passed' : 'pending_external'],
        ['Evidence mismatches', audit.summary.major, audit.summary.major === 0 ? 'passed' : 'pending_external'],
        ['Archive DOI', 'pending provider deposit', 'pending_external']
      ].map(([label, value, status]) => `
        <div><dt>${label}</dt><dd class="${status}">${value}</dd></div>`).join('');
    }
    if (literature) {
      $('#literature-grid').innerHTML = literature.entries.map(entry => `
        <article><span>${entry.year} · ${entry.atlasRelation.replaceAll('-', ' ')}</span><h3>${entry.title}</h3><p>${entry.scope}</p>
          <b>${entry.claimImportStatus.replaceAll('_', ' ')}</b><a href="${entry.primarySource}" target="_blank" rel="noreferrer">Primary source ↗</a></article>`).join('');
    }
    if (challenges) {
      $('#challenge-grid').replaceChildren();
      challenges.challenges.forEach(challenge => {
        const article = document.createElement('article');
        article.innerHTML = `<span>${challenge.challengeId}</span><small>${challenge.status} · verified starting point</small><h3>${challenge.title}</h3><p>Fit more triangles or prove that the current result is close to the best possible.</p><b>${percent(challenge.baseline.utilization)} filled now · at most ${percent(challenge.baseline.upperBound)}</b><a href="${challenge.issueUrl}" target="_blank" rel="noreferrer">Open this challenge on GitHub ↗</a>`;
        $('#challenge-grid').append(article);
      });
      $('#open-count').textContent = String(challenges.challenges.length).padStart(2, '0');
    }
  } catch {
    $('#release-gates').innerHTML = '<div><dt>Release status</dt><dd>Verification details could not be loaded. Try refreshing the page.</dd></div>';
  }
}

$('#angle').addEventListener('input', updatePhase);
$('#ratio').addEventListener('input', updatePhase);
for (const selector of ['#research-search', '#research-family', '#research-evidence']) {
  $(selector).addEventListener(selector === '#research-search' ? 'input' : 'change', () => {
    researchLimit = 24;
    renderResearchExplorer();
  });
}
$('#research-more').addEventListener('click', () => {
  researchLimit += 24;
  renderResearchExplorer();
});
$('#record-dialog .dialog-close').addEventListener('click', () => $('#record-dialog').close());
$('#record-dialog').addEventListener('click', event => {
  if (event.target === $('#record-dialog')) $('#record-dialog').close();
});
window.addEventListener('resize', updatePhase);

makePhaseMap();
updatePhase();
renderFilters();
renderRecords();
renderChallenges();
setupComparison();
loadResearchRelease();
loadV1Context();

document.querySelectorAll('[data-family-card]').forEach(card => {
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  const activate = () => {
    familyFilter = card.dataset.familyCard;
    renderFilters();
    renderRecords();
    $('#records').scrollIntoView({ behavior: 'smooth' });
  };
  card.addEventListener('click', activate);
  card.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') activate();
  });
});
