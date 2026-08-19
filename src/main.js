import { ATLAS_RECORDS, OPEN_PROBLEMS, phaseAt } from './atlas/catalog.js';
import { normalizeProblem } from './core/problem.js';
import { renderPacking } from './rendering/canvas.js';
import { escapeHtml, safeExternalUrl } from './ui/safeText.js';
import { validatePublicRelease } from './ui/releaseValidation.js';
import { loadIntegrityCheckedRelease } from './ui/shardedReleaseLoader.js';
import { describePhaseSelection, phaseGridDestination } from './ui/phaseGrid.js';
import { formatMapHash, parseMapHash } from './ui/mapState.js';
import { phaseMapDimensions, phaseMapRecords } from './ui/phaseOverview.js';
import { releaseExperience } from './ui/releaseExperience.js';
import { compareCanonicalRecords, comparisonOptionLabel } from './ui/comparisonModel.js';
import { buildComparisonGuides, comparisonMatchMessage, filterComparisonCandidates } from './ui/comparisonFinder.js';
import { formatComparisonHash, parseComparisonHash, resolveComparisonState } from './ui/comparisonState.js';
import { formatResearchHash, parseResearchHash } from './ui/researchState.js';

const $ = selector => document.querySelector(selector);
const percent = value => `${(value * 100).toFixed(1)}%`;
let familyFilter = 'all';
let selectedPhase = phaseAt(60, 1.5);
let selectedPhaseRecord = null;
let phaseMapView = 'overview';
let researchRelease = null;
let canonicalRelease = null;
let researchLimit = 24;
let dialogTrigger = null;
let dialogReturnHash = '#research';
let researchLoadAttempt = 0;
let pendingInitialTaskAnchor = true;
let researchLoadController = null;
let releaseSource = null;
let releasePhase = 'loading';
const navToggle = $('#nav-toggle');
const primaryNav = $('#primary-nav');
const pageMain = $('#main-content');
const pageFooter = $('footer');
const brandLink = $('.brand');

function setNavigationIsolation(isolated) {
  pageMain.toggleAttribute('inert', isolated);
  pageFooter.toggleAttribute('inert', isolated);
  brandLink.toggleAttribute('inert', isolated);
}

function closePrimaryNavigation({ restoreFocus = false } = {}) {
  navToggle.setAttribute('aria-expanded', 'false');
  navToggle.removeAttribute('aria-label');
  primaryNav.classList.remove('open');
  setNavigationIsolation(false);
  if (restoreFocus && getComputedStyle(navToggle).display !== 'none') navToggle.focus();
}

function trapPrimaryNavigationFocus(event) {
  if (event.key !== 'Tab' || navToggle.getAttribute('aria-expanded') !== 'true') return;
  const links = [...primaryNav.querySelectorAll('a')];
  const first = links[0];
  const last = links.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    navToggle.focus();
  } else if (!event.shiftKey && document.activeElement === navToggle) {
    event.preventDefault();
    first.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    navToggle.focus();
  } else if (event.shiftKey && document.activeElement === navToggle) {
    event.preventDefault();
    last.focus();
  }
}

function setCurrentNavigationTask(sectionId) {
  for (const link of document.querySelectorAll('#primary-nav a, .workspace-rail a')) {
    if (link.hash === `#${sectionId}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
}

function setupCurrentTaskTracking() {
  const sections = [...primaryNav.querySelectorAll('a')]
    .map(link => document.querySelector(link.hash))
    .filter(Boolean);
  const observer = new IntersectionObserver(entries => {
    const visible = entries.filter(entry => entry.isIntersecting)
      .sort((left, right) => Math.abs(left.boundingClientRect.top) - Math.abs(right.boundingClientRect.top));
    if (visible[0]) setCurrentNavigationTask(visible[0].target.id);
  }, { rootMargin: '-70px 0px -55% 0px', threshold: [0, 0.05] });
  sections.forEach(section => observer.observe(section));
  const linkedSection = sections.find(section => location.hash.startsWith(`#${section.id}`));
  if (linkedSection) setCurrentNavigationTask(linkedSection.id);
}

function restoreInitialTaskAnchor() {
  if (!pendingInitialTaskAnchor) return;
  pendingInitialTaskAnchor = false;
  const sectionId = location.hash.slice(1).split('?')[0];
  const section = document.getElementById(sectionId);
  if (!section) return;
  requestAnimationFrame(() => section.scrollIntoView({ block: 'start' }));
}

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

function choosePhaseCell(cell) {
  $('#angle').value = cell.dataset.angle;
  $('#ratio').value = cell.dataset.ratio;
  updatePhase({ historyMode: 'push' });
}

function currentMapState() {
  return {
    angle: Number($('#angle').value),
    ratio: Number($('#ratio').value),
    record: selectedPhaseRecord?.id ?? null,
    view: phaseMapView
  };
}

function applyMapState(state) {
  const linkedRecord = state.record
    ? canonicalRelease?.records.find(record => record.id === state.record && record.family !== 'scalene')
    : null;
  $('#angle').value = linkedRecord?.parameters.apexAngle ?? state.angle;
  $('#ratio').value = linkedRecord?.parameters.rectangleRatio ?? state.ratio;
  phaseMapView = state.view;
  if (researchRelease) makePhaseMap();
  updatePhase();
}

function updateMapActions() {
  const evidence = $('#map-evidence-link');
  const similar = $('#map-similar-link');
  const compareLink = $('#map-compare-link');
  if (!canonicalRelease || !selectedPhaseRecord) {
    evidence.removeAttribute('href');
    similar.removeAttribute('href');
    compareLink.removeAttribute('href');
    evidence.setAttribute('aria-disabled', 'true');
    similar.setAttribute('aria-disabled', 'true');
    compareLink.setAttribute('aria-disabled', 'true');
    evidence.textContent = 'Verified evidence unavailable';
    similar.textContent = 'Similar verified results unavailable';
    compareLink.textContent = 'Verified comparison unavailable';
    return;
  }
  evidence.removeAttribute('aria-disabled');
  similar.removeAttribute('aria-disabled');
  compareLink.removeAttribute('aria-disabled');
  evidence.textContent = 'Inspect this result’s evidence';
  similar.textContent = 'Find similar verified results';
  compareLink.textContent = 'Compare with another verified result';
  evidence.href = formatResearchHash({
    query: '', family: 'all', evidence: 'all', record: selectedPhaseRecord.id
  });
  similar.href = formatResearchHash({
    query: selectedPhaseRecord.pattern,
    family: selectedPhaseRecord.family,
    evidence: 'all',
    record: null
  });
  compareLink.href = formatComparisonHash({
    left: selectedPhaseRecord.id,
    right: comparisonDefaults().right
  });
}

function renderReleaseExperience(phase) {
  const experience = releaseExperience({
    phase,
    hasVerifiedRelease: Boolean(canonicalRelease),
    source: releaseSource,
    online: navigator.onLine
  });
  const mapStatus = $('#map-data-status');
  mapStatus.className = `map-data-status ${experience.mode}`;
  const message = document.createElement('div');
  const headline = document.createElement('b');
  const detail = document.createElement('span');
  headline.textContent = experience.headline;
  detail.textContent = experience.detail;
  message.append(headline, detail);
  mapStatus.replaceChildren(message);
  if (experience.canRetry) {
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.dataset.retryRelease = '';
    retry.textContent = experience.mode.startsWith('verified_')
      ? 'Check for release updates'
      : 'Retry verified data';
    mapStatus.append(retry);
  }
  $('#phase-trust-label').textContent = experience.canUseVerified ? 'BEST VERIFIED SAMPLE' : 'MODELED PREVIEW · NOT VERIFIED DATA';
  updateMapActions();
  return experience;
}

function handlePhaseGridKeydown(event) {
  const cell = event.target.closest('.phase-cell');
  if (!cell) return;
  const cells = [...$('#phase-grid').querySelectorAll('.phase-cell')];
  const columns = Number($('#phase-grid').dataset.columns || 1);
  const index = cells.indexOf(cell);
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    choosePhaseCell(cell);
    return;
  }
  const nextIndex = phaseGridDestination({ key: event.key, index, columns, count: cells.length, ctrlKey: event.ctrlKey });
  if (nextIndex == null) return;
  event.preventDefault();
  cells[nextIndex].tabIndex = 0;
  cell.tabIndex = -1;
  cells[nextIndex].focus();
}

function createPhaseCell({ angle, ratio, phase, computed = false, confidence = 1 }) {
  const cell = document.createElement('button');
  cell.type = 'button';
  cell.className = `phase-cell${computed ? ' computed' : ''}`;
  cell.dataset.angle = angle;
  cell.dataset.ratio = ratio;
  cell.tabIndex = -1;
  cell.setAttribute('role', 'gridcell');
  cell.setAttribute('aria-selected', 'false');
  cell.style.setProperty('--phase-color', phase.color);
  if (computed) cell.style.setProperty('--confidence', Math.max(.45, confidence));
  cell.title = `${angle}°, ${ratio}:1 — ${phase.name}${phase.utilization == null ? '' : `, ${percent(phase.utilization)} filled`}`;
  cell.setAttribute('aria-label', cell.title);
  cell.addEventListener('click', () => choosePhaseCell(cell));
  return cell;
}

function syncPhaseGridSelection(angle, ratio) {
  const cells = [...$('#phase-grid').querySelectorAll('.phase-cell')];
  if (!cells.length) return;
  const selected = cells.reduce((nearest, cell) => {
    const distance = Math.hypot(Number(cell.dataset.angle) - angle, Number(cell.dataset.ratio) - ratio);
    return !nearest || distance < nearest.distance ? { cell, distance } : nearest;
  }, null).cell;
  cells.forEach(cell => {
    const active = cell === selected;
    cell.tabIndex = active ? 0 : -1;
    cell.setAttribute('aria-selected', String(active));
  });
}

function makePhaseMap() {
  const grid = $('#phase-grid');
  grid.replaceChildren();
  if (researchRelease) {
    const allRecords = researchRelease.records.filter(record => record.family !== 'scalene');
    const records = phaseMapRecords(researchRelease.records, phaseMapView);
    const { rows, columns } = phaseMapDimensions(records);
    grid.dataset.columns = columns;
    grid.setAttribute('aria-colcount', columns);
    grid.setAttribute('aria-rowcount', rows);
    grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    records.forEach(record => {
        grid.append(createPhaseCell({
          angle: record.parameters.apexAngle,
          ratio: record.parameters.rectangleRatio,
          phase: { name: record.pattern, color: recordColor(record), utilization: record.verification.utilization },
          computed: true,
          confidence: 1 - record.bounds.optimalityGap
        }));
      });
    document.querySelectorAll('[data-phase-view]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.phaseView === phaseMapView));
    });
    $('#phase-view-status').textContent = phaseMapView === 'all'
      ? `Showing all ${allRecords.length} verified map samples.`
      : `Showing ${records.length} representative samples of ${allRecords.length}. Sliders and evidence use all ${allRecords.length} verified samples.`;
    $('#resolution-label').textContent = researchRelease.sampling.resolution;
    syncPhaseGridSelection(Number($('#angle').value), Number($('#ratio').value));
    return;
  }
  const angles = [110, 95, 80, 65, 50, 35];
  const ratios = [0.75, 1.1, 1.5, 2, 2.5, 3];
  grid.dataset.columns = ratios.length;
  grid.setAttribute('aria-colcount', ratios.length);
  grid.setAttribute('aria-rowcount', angles.length);
  grid.style.gridTemplateColumns = 'repeat(6, 1fr)';
  for (const angle of angles) {
    for (const ratio of ratios) {
      const phase = phaseAt(angle, ratio);
      grid.append(createPhaseCell({ angle, ratio, phase }));
    }
  }
  syncPhaseGridSelection(Number($('#angle').value), Number($('#ratio').value));
}

function updatePhase({ historyMode = null } = {}) {
  const angle = Number($('#angle').value);
  const ratio = Number($('#ratio').value);
  const nearest = nearestComputed(angle, ratio);
  selectedPhaseRecord = nearest?.record ?? null;
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
  syncPhaseGridSelection(angle, ratio);
  $('#phase-summary').textContent = describePhaseSelection({
    angle,
    ratio,
    phase: selectedPhase,
    nearestDistance: nearest?.distance ?? null
  });
  $('#phase-dot').style.background = selectedPhase.color;
  $('#live-label').textContent = `${angle}° / ${ratio.toFixed(2)}:1`;
  $('#used-bar').style.width = percent(selectedPhase.utilization);
  $('#used-bar').style.background = selectedPhase.color;
  $('#waste-bar').style.width = percent(1 - selectedPhase.utilization);
  drawPattern($('#live-canvas'), angle, ratio, selectedPhase);
  updateMapActions();
  if (historyMode) history[`${historyMode}State`](null, '', formatMapHash(currentMapState()));
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
    <div class="record-preview"><canvas width="540" height="340" aria-label="${escapeHtml(record.title)} packing"></canvas><span>${escapeHtml(statusLabel(record))}</span></div>
    <div class="record-meta"><small>${escapeHtml(record.family)} · ${record.problem.width.toFixed(1)} × ${record.problem.height.toFixed(1)}</small><h3>${escapeHtml(record.title)}</h3>
      <dl><div><dt>Fill</dt><dd>${percent(record.verification.utilization)}</dd></div><div><dt>Pieces</dt><dd>${record.solution.placements.length}</dd></div><div><dt>Gap</dt><dd>${percent(record.verification.optimalityGap)}</dd></div></dl>
    </div>`;
  article.tabIndex = 0;
  article.setAttribute('role', 'button');
  article.addEventListener('click', () => openRecord(record, article));
  article.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openRecord(record, article);
    }
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

function openRecord(record, trigger = document.activeElement) {
  dialogTrigger = trigger;
  const detail = $('#record-detail');
  detail.innerHTML = `
    <div class="detail-header"><div><p class="kicker">${escapeHtml(record.family)} / ${escapeHtml(statusLabel(record))}</p><h2 id="record-dialog-title">${escapeHtml(record.title)}</h2><p id="record-dialog-summary">${escapeHtml(record.pattern)}. Fingerprint <code>${escapeHtml(record.verification.fingerprint)}</code></p></div>
      <div class="detail-stat"><b>${percent(record.verification.utilization)}</b><span>verified fill</span></div></div>
    <canvas width="1000" height="560" aria-label="${escapeHtml(record.title)} detailed packing"></canvas>
    <div class="detail-grid">
      <section><h3>Filled and empty space</h3><div class="detail-waste"><span style="width:${percent(record.verification.utilization)}"></span><i style="width:${percent(1 - record.verification.utilization)}"></i></div>
        <dl><div><dt>Filled by triangles</dt><dd>${percent(record.verification.utilization)}</dd></div><div><dt>Empty space</dt><dd>${percent(1 - record.verification.utilization)}</dd></div><div><dt>Overlap</dt><dd>0.0%</dd></div></dl></section>
      <section><h3>How the result improved</h3><div class="timeline">${record.history.map(point => `<div><b style="height:${Math.max(8, point.utilization * 100)}%"></b><span>${point.year}</span><small>${percent(point.utilization)}</small></div>`).join('')}</div></section>
      <section><h3>Source and verification</h3><p>Created by <code>${escapeHtml(record.provenance.generator)}</code> and checked independently using the Atlas geometry rules.</p><a href="/atlas-v1.json" download>Download coordinates ↓</a></section>
    </div>`;
  const dialog = $('#record-dialog');
  dialog.showModal();
  dialog.querySelector('.dialog-close').focus({ preventScroll: true });
  requestAnimationFrame(() => renderPacking(
    detail.querySelector('canvas'),
    normalizeProblem(record.problem),
    { state: record.solution.placements }
  ));
}

function renderFilters() {
  const filters = $('#family-filters');
  filters.replaceChildren();
  ['all', 'right', 'equilateral', 'isosceles'].forEach(family => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = family;
    button.className = family === familyFilter ? 'active' : '';
    button.setAttribute('aria-pressed', String(family === familyFilter));
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
    article.innerHTML = `<span>OP-${String(index + 1).padStart(2, '0')}</span><small>${escapeHtml(problem.family)} · ${escapeHtml(problem.difficulty)}</small><h3>${escapeHtml(problem.title)}</h3><p>${escapeHtml(problem.question)}</p><b>${escapeHtml(problem.shape)} / ${escapeHtml(problem.ratio)}:1</b>`;
    $('#challenge-grid').append(article);
  });
}

function compare() {
  if (!canonicalRelease) return;
  const left = canonicalRelease.records.find(record => record.id === $('#compare-a').value);
  const right = canonicalRelease.records.find(record => record.id === $('#compare-b').value);
  if (!left || !right) return;
  const result = compareCanonicalRecords(left, right);
  $('#comparison').setAttribute('aria-busy', 'false');
  $('#comparison').innerHTML = [left, right].map((record, index) => `
    <article><span>${escapeHtml(record.evidence.state.replaceAll('_', ' '))}</span><small>Result ${index === 0 ? 'A' : 'B'} · ${escapeHtml(record.experimentId)}</small><h3>${escapeHtml(record.pattern)}</h3>
      <div class="comparison-bar"><i style="width:${percent(record.verification.utilization)}"></i></div>
      <dl><div><dt>Verified fill</dt><dd>${percent(record.verification.utilization)}</dd></div><div><dt>Verified pieces</dt><dd>${record.verification.pieceCount}</dd></div><div><dt>Room for improvement</dt><dd>${percent(record.bounds.optimalityGap)}</dd></div><div><dt>Numerical stability</dt><dd>${escapeHtml(stabilityLabel(record.verification.stability))}</dd></div></dl>
      <a href="${formatResearchHash({ query: '', family: 'all', evidence: 'all', record: record.id })}">Inspect result ${index === 0 ? 'A' : 'B'} evidence</a>
    </article>`).join('');
  const fillDifference = Math.abs(result.utilizationDelta);
  const gapDifference = Math.abs(result.gapDelta);
  const fillLead = result.higherFill === 'tie' ? 'Both results have the same verified fill.' : `Result ${result.higherFill === 'left' ? 'A' : 'B'} fills ${percent(fillDifference)} more of its rectangle.`;
  const gapLead = result.smallerGap === 'tie' ? 'Both results have the same optimality gap.' : `Result ${result.smallerGap === 'left' ? 'A' : 'B'} has ${percent(gapDifference)} less room for improvement.`;
  $('#comparison-summary').textContent = `${fillLead} ${gapLead} Different triangle and rectangle sizes can make piece counts non-comparable.`;
}

function comparisonDefaults() {
  return {
    left: canonicalRelease.records.some(record => record.id === 'iso-a90-r1p5') ? 'iso-a90-r1p5' : canonicalRelease.records[0].id,
    right: canonicalRelease.records.some(record => record.id === 'iso-a110-r3') ? 'iso-a110-r3' : canonicalRelease.records[1].id
  };
}

function currentComparisonState() {
  return { left: $('#compare-a').value, right: $('#compare-b').value };
}

function renderComparisonCandidates(side) {
  if (!canonicalRelease) return;
  const select = $(`#compare-${side}`);
  const search = $(`#compare-search-${side}`);
  const selectedId = select.dataset.selectedId || select.value || comparisonDefaults()[side === 'a' ? 'left' : 'right'];
  const selected = canonicalRelease.records.find(record => record.id === selectedId);
  const matches = filterComparisonCandidates(canonicalRelease.records, search.value);
  select.replaceChildren();
  if (selected && !matches.some(record => record.id === selected.id)) {
    const currentGroup = document.createElement('optgroup');
    currentGroup.label = 'Current result (retained)';
    currentGroup.append(new Option(comparisonOptionLabel(selected), selected.id));
    select.append(currentGroup);
  }
  const grouped = new Map();
  for (const record of matches) {
    if (!grouped.has(record.family)) grouped.set(record.family, []);
    grouped.get(record.family).push(record);
  }
  for (const family of ['right', 'equilateral', 'isosceles', 'scalene']) {
    const records = grouped.get(family) ?? [];
    if (!records.length) continue;
    const group = document.createElement('optgroup');
    group.label = `${family} triangles`;
    for (const record of records) group.append(new Option(comparisonOptionLabel(record), record.id));
    select.append(group);
  }
  select.dataset.selectedId = selectedId;
  select.value = selectedId;
  select.disabled = false;
  $(`#compare-status-${side}`).textContent = comparisonMatchMessage({
    matches: matches.length,
    total: canonicalRelease.records.length,
    retained: Boolean(selected)
  });
}

function renderComparisonGuides() {
  if (!canonicalRelease) return;
  const guides = buildComparisonGuides(canonicalRelease.records, $('#compare-a').dataset.selectedId);
  $('#comparison-guide-actions').innerHTML = guides.map(guide => `
    <button type="button" data-comparison-guide data-left="${escapeHtml(guide.left)}" data-right="${escapeHtml(guide.right)}">
      <b>${escapeHtml(guide.title)}</b><span>${escapeHtml(guide.description)}</span>
    </button>`).join('');
}

function applyComparisonState(state) {
  if (!canonicalRelease) return;
  const resolved = resolveComparisonState(state, canonicalRelease.records.map(record => record.id), comparisonDefaults());
  $('#compare-a').dataset.selectedId = resolved.left;
  $('#compare-b').dataset.selectedId = resolved.right;
  renderComparisonCandidates('a');
  renderComparisonCandidates('b');
  compare();
  renderComparisonGuides();
}

function updateComparison({ historyMode = 'push' } = {}) {
  compare();
  renderComparisonGuides();
  history[`${historyMode}State`](null, '', formatComparisonHash(currentComparisonState()));
}

function setupComparison() {
  if (!canonicalRelease) return;
  for (const side of ['a', 'b']) {
    const select = $(`#compare-${side}`);
    const search = $(`#compare-search-${side}`);
    search.disabled = false;
    search.oninput = () => renderComparisonCandidates(side);
    select.onchange = () => {
      select.dataset.selectedId = select.value;
      updateComparison();
    };
  }
  for (const selector of ['#comparison-swap', '#comparison-reset', '#comparison-share']) $(selector).disabled = false;
  applyComparisonState(parseComparisonHash(location.hash));
}

function setComparisonUnavailable(message) {
  for (const side of ['a', 'b']) {
    const select = $(`#compare-${side}`);
    $(`#compare-search-${side}`).disabled = true;
    select.disabled = true;
    select.replaceChildren(new Option(message));
    $(`#compare-status-${side}`).textContent = message;
  }
  for (const selector of ['#comparison-swap', '#comparison-reset', '#comparison-share']) $(selector).disabled = true;
  $('#comparison').setAttribute('aria-busy', 'false');
  $('#comparison').innerHTML = `<p class="comparison-loading">${escapeHtml(message)}</p>`;
  $('#comparison-summary').textContent = message;
  $('#comparison-guide-actions').innerHTML = `<p>${escapeHtml(message)}</p>`;
}

function renderLeaderboard() {
  if (!researchRelease) return;
  const leaders = [...researchRelease.records]
    .sort((left, right) => right.verification.utilization - left.verification.utilization)
    .slice(0, 8);
  $('#leaderboard').innerHTML = leaders.map((record, index) => `
    <article><b>${String(index + 1).padStart(2, '0')}</b><div><small>${escapeHtml(record.family)} · ${record.parameters.apexAngle}° · ${record.parameters.rectangleRatio}:1</small><h3>${escapeHtml(record.pattern)}</h3><span>${escapeHtml(record.provenance.contributor)}</span></div>
      <strong>${percent(record.verification.utilization)}</strong><em>gap ${percent(record.bounds.optimalityGap)}</em></article>`).join('');
}

async function loadResearchRelease() {
  if (!navigator.onLine) {
    showOfflineExperience();
    return;
  }
  const attempt = ++researchLoadAttempt;
  researchLoadController?.abort();
  researchLoadController = new AbortController();
  const status = $('#research-load-status');
  const retainingVerifiedRelease = Boolean(canonicalRelease && researchRelease);
  releasePhase = 'loading';
  renderReleaseExperience('loading');
  if (!retainingVerifiedRelease) {
    canonicalRelease = null;
    researchRelease = null;
    releaseSource = null;
    makePhaseMap();
    updatePhase();
  }
  $('#research-results').setAttribute('aria-busy', 'true');
  if (retainingVerifiedRelease) {
    status.className = 'research-load-status refreshing';
    status.innerHTML = '<b>Rechecking verified research data…</b><span>The last verified results remain available during this integrity check.</span>';
  } else {
    $('#research-results').innerHTML = '<p class="research-loading">Preparing verified records…</p>';
    $('#research-result-count').textContent = 'Loading canonical release…';
    $('#research-more').hidden = true;
    status.className = 'research-load-status loading';
    status.innerHTML = '<b>Loading verified research data…</b><span>Checking release integrity before results are shown.</span>';
  }
  try {
    const loaded = await loadIntegrityCheckedRelease({
      signal: researchLoadController.signal,
      onProgress: progress => {
        if (attempt !== researchLoadAttempt) return;
        $('#resolution-label').textContent = `verified ${progress.loadedRecords} records from ${progress.loadedShards}/${progress.totalShards} shards…`;
        status.innerHTML = `<b>Verifying research data…</b><span>${progress.loadedRecords} records checked from ${progress.loadedShards} of ${progress.totalShards} release shards.</span>`;
      }
    });
    if (attempt !== researchLoadAttempt) return;
    const release = loaded.release;
    const validation = validatePublicRelease(release);
    if (!validation.valid) throw new Error(`Invalid public release: ${validation.errors[0]}`);
    canonicalRelease = release;
    releaseSource = loaded.source;
    releasePhase = 'ready';
    researchRelease = {
      records: canonicalRelease.records,
      verifiedCount: canonicalRelease.coverage.verified,
      sampling: {
        rectangleRatios: [...new Set(canonicalRelease.records
          .filter(record => record.family !== 'scalene')
          .map(record => record.parameters.rectangleRatio))],
        resolution: loaded.source === 'verified_shards'
          ? `${canonicalRelease.coverage.records} verified records · integrity-checked shards`
          : `${canonicalRelease.coverage.records} verified records · checksum-checked fallback`
      }
    };
    $('#record-count').textContent = String(researchRelease.verifiedCount);
    makePhaseMap();
    updatePhase();
    renderLeaderboard();
    setupComparison();
    applyResearchState(parseResearchHash(location.hash));
    renderResearchExplorer();
    status.className = `research-load-status ready ${loaded.source}`;
    status.innerHTML = loaded.source === 'verified_shards'
      ? `<b>Verified release ready</b><span>${canonicalRelease.coverage.records} records passed integrity checks from the canonical release shards.</span>`
      : `<b>Verified fallback release ready</b><span>${canonicalRelease.coverage.records} records passed the canonical checksum after a shard was unavailable. No partial shard data is shown.</span>`;
    renderReleaseExperience('ready');
    restoreInitialTaskAnchor();
  } catch (error) {
    if (attempt !== researchLoadAttempt || error.name === 'AbortError') return;
    releasePhase = 'failed';
    if (retainingVerifiedRelease) {
      $('#research-results').setAttribute('aria-busy', 'false');
      renderResearchExplorer();
      status.className = 'research-load-status failed-retained';
      status.innerHTML = '<b>Refresh failed · last verified results retained</b><span>The failed attempt did not replace the previously integrity-checked release.</span>';
      renderReleaseExperience('failed');
      return;
    }
    $('#resolution-label').textContent = 'verified dataset unavailable';
    $('#research-result-count').textContent = 'The verified dataset could not be loaded safely. Try refreshing the page.';
    $('#research-results').setAttribute('aria-busy', 'false');
    $('#research-results').innerHTML = '<div class="load-error" role="alert"><h3>Verified results are temporarily unavailable.</h3><p>The release failed availability or integrity checks. Research records remain hidden so partial or unverified data is never presented as trustworthy.</p><button type="button" data-retry-release>Try loading verified data again</button></div>';
    $('#research-more').hidden = true;
    status.className = 'research-load-status failed';
    status.innerHTML = '<b>Release verification failed</b><span>No research records were displayed. You can retry without reloading the page.</span>';
    setComparisonUnavailable('Verified comparison records are temporarily unavailable.');
    makePhaseMap();
    updatePhase();
    renderReleaseExperience('failed');
    restoreInitialTaskAnchor();
  }
}

function showOfflineExperience() {
  researchLoadController?.abort();
  releasePhase = canonicalRelease ? 'ready' : 'failed';
  const status = $('#research-load-status');
  $('#research-results').setAttribute('aria-busy', 'false');
  if (canonicalRelease) {
    status.className = 'research-load-status offline-retained';
    status.innerHTML = '<b>Offline · last verified results retained</b><span>Reconnect to check whether a newer verified release is available.</span>';
  } else {
    $('#research-result-count').textContent = 'Verified evidence is unavailable while offline.';
    $('#research-results').innerHTML = '<div class="load-error" role="alert"><h3>You appear to be offline.</h3><p>No verified research records are shown. Reconnect and the Atlas will retry automatically.</p></div>';
    $('#research-more').hidden = true;
    status.className = 'research-load-status offline';
    status.innerHTML = '<b>You appear to be offline</b><span>The map is a modeled preview until verified data can be checked.</span>';
    setComparisonUnavailable('Verified comparison records are unavailable while offline.');
  }
  renderReleaseExperience(releasePhase);
  restoreInitialTaskAnchor();
}

function researchRecordLabel(record) {
  return record.family === 'scalene'
    ? `${record.family} · ${record.id.split('-r')[0]} · ${record.parameters.rectangleRatio}:1`
    : `${record.family} · ${record.parameters.apexAngle}° · ${record.parameters.rectangleRatio}:1`;
}

function stabilityLabel(stability) {
  if (stability?.classification === 'robust') return 'Clear of numerical limits';
  if (stability?.classification === 'contact') return 'Exact contact, independently checked';
  if (stability?.classification === 'tolerance_dependent') return 'Depends on numerical tolerance';
  return 'Stability check unavailable';
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

function currentResearchState({ record = null } = {}) {
  return {
    query: $('#research-search').value,
    family: $('#research-family').value,
    evidence: $('#research-evidence').value,
    record
  };
}

function applyResearchState(state) {
  $('#research-search').value = state.query;
  $('#research-family').value = state.family;
  $('#research-evidence').value = state.evidence;
  researchLimit = 24;
}

function clearResearchFilters({ updateHistory = true } = {}) {
  applyResearchState({ query: '', family: 'all', evidence: 'all' });
  if (updateHistory) history.pushState(null, '', '#research');
  renderResearchExplorer();
  $('#research-search').focus();
}

function researchDialogNavigation(record) {
  const records = filteredResearchRecords();
  const index = records.findIndex(item => item.id === record.id);
  if (index < 0) return '<nav class="detail-navigation" aria-label="Browse filtered results"><p>This linked result is outside the current filters.</p></nav>';
  const previous = records[index - 1];
  const next = records[index + 1];
  return `<nav class="detail-navigation" aria-label="Browse filtered results">
    <button type="button" data-dialog-record="${escapeHtml(previous?.id ?? '')}" ${previous ? '' : 'disabled'}>← Previous result</button>
    <p role="status">Result ${index + 1} of ${records.length} in the current filters</p>
    <button type="button" data-dialog-record="${escapeHtml(next?.id ?? '')}" ${next ? '' : 'disabled'}>Next result →</button>
  </nav>`;
}

function researchComparisonHref(record) {
  const defaults = comparisonDefaults();
  const partner = defaults.left === record.id ? defaults.right : defaults.left;
  return formatComparisonHash({ left: record.id, right: partner });
}

function openResearchRecord(record, { preserveContext = false } = {}) {
  if (!preserveContext) {
    dialogTrigger = document.activeElement;
    dialogReturnHash = formatResearchHash(currentResearchState());
  }
  const detail = $('#record-detail');
  detail.innerHTML = `
    <div class="detail-header"><div><p class="kicker">${escapeHtml(record.family)} / ${escapeHtml(record.evidence.state.replaceAll('_', ' '))}</p><h2 id="record-dialog-title">${escapeHtml(record.experimentId)}</h2><p id="record-dialog-summary">${escapeHtml(record.evidence.claim)}</p></div>
      <div class="detail-stat"><b>${percent(record.verification.utilization)}</b><span>verified lower bound</span></div></div>
    <canvas width="1000" height="560" aria-label="${escapeHtml(record.id)} packing coordinates"></canvas>
    <div class="detail-grid">
      <section><h3>Verification certificate</h3><p><code>${escapeHtml(record.verification.certificate)}</code></p><dl><div><dt>Pieces</dt><dd>${record.verification.pieceCount}</dd></div><div><dt>Overlap</dt><dd>0</dd></div><div><dt>Numerical stability</dt><dd>${escapeHtml(stabilityLabel(record.verification.stability))}</dd></div><div><dt>Verifier</dt><dd>${escapeHtml(record.verification.verifier)}</dd></div></dl></section>
      <section><h3>Best result and proven limit</h3><dl><div><dt>Verified fill</dt><dd>${percent(record.bounds.lowerBound)}</dd></div><div><dt>Proven maximum</dt><dd>${percent(record.bounds.upperBound)}</dd></div><div><dt>Room for improvement</dt><dd>${percent(record.bounds.optimalityGap)}</dd></div></dl><p>Priority for checking empty boundary space: ${escapeHtml(record.descriptors.boundaryGapAnalysis.priority)}.</p></section>
      <section><h3>Reproduce this result</h3><p><code>${escapeHtml(record.reproducibility.command)}</code></p><p>Seed <code>${escapeHtml(record.reproducibility.seed)}</code><br>Fingerprint <code>${escapeHtml(record.verification.fingerprint)}</code></p><a href="/atlas-v2.json" download>Download coordinates ↓</a></section>
    </div>${researchDialogNavigation(record)}
    <a class="detail-compare-action" href="${escapeHtml(researchComparisonHref(record))}">Compare this result with another verified record</a>`;
  const dialog = $('#record-dialog');
  if (!dialog.open) dialog.showModal();
  dialog.querySelector('.dialog-close').focus({ preventScroll: true });
  requestAnimationFrame(() => renderPacking(
    detail.querySelector('canvas'),
    normalizeProblem(record.problem),
    { state: record.solution.placements }
  ));
  history.pushState(null, '', formatResearchHash(currentResearchState({ record: record.id })));
}

function renderResearchExplorer() {
  if (!canonicalRelease) return;
  $('#research-results').setAttribute('aria-busy', 'false');
  const records = filteredResearchRecords();
  const visible = records.slice(0, researchLimit);
  $('#research-summary').innerHTML = [
    ['Verified records', canonicalRelease.coverage.verified],
    ['Proven controls', canonicalRelease.coverage.provenOptimal],
    ['Observed transitions', canonicalRelease.coverage.phaseTransitions],
    ['Adaptive improvements', canonicalRelease.coverage.adaptivelyImproved ?? 0],
    ['Open compute tasks', canonicalRelease.coverage.openDistributedTasks]
  ].map(([label, value]) => `<div><b>${value}</b><span>${label}</span></div>`).join('');
  $('#research-results').innerHTML = visible.length ? visible.map(record => `
    <button type="button" data-record="${escapeHtml(record.id)}">
      <span><b>${escapeHtml(researchRecordLabel(record))}</b><small>${escapeHtml(record.experimentId)}</small></span>
      <span>${escapeHtml(record.pattern)}</span>
      <span><i class="${escapeHtml(record.evidence.state)}">${escapeHtml(record.evidence.state.replaceAll('_', ' '))}</i></span>
      <span><b>${percent(record.verification.utilization)}</b><small>gap ${percent(record.bounds.optimalityGap)}</small></span>
    </button>`).join('') : `<div class="research-empty" role="status"><h3>No verified results match these filters.</h3><p>Change the search terms or clear every filter to return to all ${canonicalRelease.coverage.records} records.</p><button type="button" data-clear-research>Clear filters</button></div>`;
  $('#research-results').querySelectorAll('[data-record]').forEach(button => {
    button.addEventListener('click', () =>
      openResearchRecord(canonicalRelease.records.find(record => record.id === button.dataset.record)));
  });
  $('#research-result-count').textContent = `Showing ${visible.length} of ${records.length} matching records`;
  $('#research-more').hidden = visible.length >= records.length;
  $('#research-clear').hidden = !($('#research-search').value || $('#research-family').value !== 'all' || $('#research-evidence').value !== 'all');
  $('#research-results [data-clear-research]')?.addEventListener('click', () => clearResearchFilters());
  $('#transition-list').innerHTML = canonicalRelease.transitions.slice(0, 8).map(transition => `
    <article><b>${transition.apexAngle}°</b><span>${transition.betweenRatios.join('–')}:1</span><p>${escapeHtml(transition.from)} → ${escapeHtml(transition.to)}</p><small>${escapeHtml(transition.evidence.join(' / '))}</small></article>`).join('') ||
    '<p>No pattern transition was observed at this sampling resolution.</p>';
  const linkedState = parseResearchHash(location.hash);
  if (linkedState.record) {
    const record = canonicalRelease.records.find(item => item.id === linkedState.record);
    if (record && !$('#record-dialog').open) openResearchRecord(record);
  }
}

async function loadV1Context() {
  try {
    const [auditResponse, literatureResponse, challengeResponse, proofResponse, proofJobResponse, contributionResponse, recoveryResponse] = await Promise.all([
      fetch('/audit-v2.json'),
      fetch('/literature/registry.json'),
      fetch('/community-challenges-v2.json'),
      fetch('/finite-domain-proofs-v2.json'),
      fetch('/finite-domain-proof-jobs-v2.json'),
      fetch('/contribution-status-v2.json'),
      fetch('/distributed-recovery-health-v2.json')
    ]);
    const audit = auditResponse.ok ? await auditResponse.json() : null;
    const literature = literatureResponse.ok ? await literatureResponse.json() : null;
    const challenges = challengeResponse.ok ? await challengeResponse.json() : null;
    const proofIndex = proofResponse.ok ? await proofResponse.json() : null;
    const proofJobIndex = proofJobResponse.ok ? await proofJobResponse.json() : null;
    const contributionStatus = contributionResponse.ok ? await contributionResponse.json() : null;
    const recoveryHealth = recoveryResponse.ok ? await recoveryResponse.json() : null;
    if (audit) {
      $('#release-gates').innerHTML = [
        ['Canonical geometry replay', `${audit.summary.replayed}/${audit.summary.records} passed`, 'passed'],
        ['Critical audit findings', audit.summary.critical, audit.summary.critical === 0 ? 'passed' : 'pending_external'],
        ['Evidence mismatches', audit.summary.major, audit.summary.major === 0 ? 'passed' : 'pending_external'],
        ['Distributed recovery', recoveryHealth?.ready ? 'Ready · restart-safe' : 'Unavailable', recoveryHealth?.ready ? 'passed' : 'pending_external'],
        ['Archive DOI', 'pending provider deposit', 'pending_external']
      ].map(([label, value, status]) => `
        <div><dt>${label}</dt><dd class="${status}">${value}</dd></div>`).join('');
    }
    if (literature) {
      $('#literature-grid').innerHTML = literature.entries.map(entry => `
        <article><span>${escapeHtml(entry.year)} · ${escapeHtml(entry.atlasRelation.replaceAll('-', ' '))}</span><h3>${escapeHtml(entry.title)}</h3><p>${escapeHtml(entry.scope)}</p>
          <b>${escapeHtml(entry.claimImportStatus.replaceAll('_', ' '))}</b><a href="${escapeHtml(safeExternalUrl(entry.primarySource))}" target="_blank" rel="noreferrer">Primary source ↗</a></article>`).join('');
    }
    if (challenges) {
      $('#challenge-grid').replaceChildren();
      challenges.challenges.forEach(challenge => {
        const article = document.createElement('article');
        article.innerHTML = `<span>${escapeHtml(challenge.challengeId)}</span><small>${escapeHtml(challenge.status)} · verified starting point</small><h3>${escapeHtml(challenge.title)}</h3><p>Fit more triangles or prove that the current result is close to the best possible.</p><b>${percent(challenge.baseline.utilization)} filled now · at most ${percent(challenge.baseline.upperBound)}</b><a href="${escapeHtml(safeExternalUrl(challenge.issueUrl))}" target="_blank" rel="noreferrer">Open this challenge on GitHub ↗</a>`;
        $('#challenge-grid').append(article);
      });
      $('#open-count').textContent = String(challenges.challenges.length).padStart(2, '0');
    }
    if (contributionStatus) {
      const awaiting = contributionStatus.counts.quarantined_for_review ?? 0;
      const approved = contributionStatus.counts.approved_for_promotion ?? 0;
      $('#contribution-status').innerHTML = `
        <div><dt>Awaiting evidence review</dt><dd>${awaiting}</dd></div>
        <div><dt>Approved for the next release</dt><dd>${approved}</dd></div>
        <div><dt>Signed review policy</dt><dd>${contributionStatus.reviewAuthority?.enforced ?
          (contributionStatus.reviewAuthority.activeKeys > 0 ?
            `${contributionStatus.reviewAuthority.activeKeys} active keys · two reviewers for proofs` :
            'Enforced · no review keys registered yet') :
          'Not available'}</dd></div>
        <div><dt>Process integrity</dt><dd>Ledger ${escapeHtml(contributionStatus.ledgerSha256.slice(0, 12))}…</dd></div>`;
    }
    if (proofIndex?.proofs?.length) {
      const proof = proofIndex.proofs[0];
      const certificate = proof.certificate;
      const job = proofJobIndex?.jobs?.find(entry => entry.jobId === proof.proofId);
      const jobStage = job?.checkpoint?.stage === 'proof_ready' ? 'Completed and replayable' : 'Checkpoint unavailable';
      $('#finite-domain-proof-summary').innerHTML = `
        <div><p class="kicker">CERTIFIED CONTROL</p><h3>${escapeHtml(proof.proofId)}</h3></div>
        <p><b>${certificate.optimum} placements</b> is proven best among ${certificate.domain.candidateCount} declared candidates. This is a finite search result, not a claim about the global optimum.</p>
        <dl><div><dt>Proof job</dt><dd>${escapeHtml(jobStage)}</dd></div><div><dt>Linked atlas result</dt><dd>${escapeHtml(proof.linkedRecordId)}</dd></div><div><dt>Certificate digest</dt><dd>${escapeHtml(certificate.sha256.slice(0, 12))}…</dd></div></dl>`;
    }
  } catch {
    $('#release-gates').innerHTML = '<div><dt>Release status</dt><dd>Verification details could not be loaded. Try refreshing the page.</dd></div>';
  }
}

$('#angle').addEventListener('input', () => updatePhase({ historyMode: 'replace' }));
$('#ratio').addEventListener('input', () => updatePhase({ historyMode: 'replace' }));
$('#phase-grid').addEventListener('keydown', handlePhaseGridKeydown);
document.querySelectorAll('[data-map-preset]').forEach(button => {
  button.addEventListener('click', () => {
    $('#angle').value = button.dataset.angle;
    $('#ratio').value = button.dataset.ratio;
    updatePhase({ historyMode: 'push' });
    $('#phase-summary').focus({ preventScroll: true });
  });
});
document.querySelectorAll('[data-phase-view]').forEach(button => {
  button.addEventListener('click', () => {
    phaseMapView = button.dataset.phaseView;
    makePhaseMap();
    updatePhase({ historyMode: 'push' });
    $('#phase-grid').querySelector('[tabindex="0"]')?.focus({ preventScroll: true });
  });
});
$('#map-share').addEventListener('click', async () => {
  const status = $('#map-share-status');
  const url = new URL(formatMapHash(currentMapState()), location.href).href;
  try {
    await navigator.clipboard.writeText(url);
    status.textContent = 'Link copied. It will reopen this exact verified sample.';
  } catch {
    status.textContent = 'Copy was unavailable. Use the address bar to copy this view.';
  }
});
for (const selector of ['#research-search', '#research-family', '#research-evidence']) {
  $(selector).addEventListener(selector === '#research-search' ? 'input' : 'change', () => {
    researchLimit = 24;
    const hash = formatResearchHash(currentResearchState());
    if (selector === '#research-search') history.replaceState(null, '', hash);
    else history.pushState(null, '', hash);
    renderResearchExplorer();
  });
}
$('#research-clear').addEventListener('click', () => clearResearchFilters());
$('#research-results').addEventListener('click', event => {
  if (event.target.closest('[data-retry-release]')) loadResearchRelease();
});
$('#map-data-status').addEventListener('click', event => {
  if (event.target.closest('[data-retry-release]')) loadResearchRelease();
});
window.addEventListener('offline', showOfflineExperience);
window.addEventListener('online', () => loadResearchRelease());
window.addEventListener('popstate', () => {
  if (location.hash.startsWith('#map')) applyMapState(parseMapHash(location.hash));
  if (location.hash.startsWith('#compare')) applyComparisonState(parseComparisonHash(location.hash));
  if (location.hash.startsWith('#research')) {
    applyResearchState(parseResearchHash(location.hash));
    renderResearchExplorer();
  }
});
$('#comparison-swap').addEventListener('click', () => {
  const state = currentComparisonState();
  applyComparisonState({ left: state.right, right: state.left });
  updateComparison();
  $('#compare-a').focus();
});
$('#comparison-reset').addEventListener('click', () => {
  applyComparisonState(comparisonDefaults());
  updateComparison();
  $('#compare-a').focus();
});
$('#comparison-share').addEventListener('click', async () => {
  const status = $('#comparison-share-status');
  const url = new URL(formatComparisonHash(currentComparisonState()), location.href).href;
  try {
    await navigator.clipboard.writeText(url);
    status.textContent = 'Comparison link copied.';
  } catch {
    status.textContent = 'Copy was unavailable. Use the address bar to copy this comparison.';
  }
});
$('#comparison-guide-actions').addEventListener('click', event => {
  const button = event.target.closest('[data-comparison-guide]');
  if (!button || !canonicalRelease) return;
  $('#compare-search-a').value = '';
  $('#compare-search-b').value = '';
  applyComparisonState({ left: button.dataset.left, right: button.dataset.right });
  updateComparison();
  $('#comparison-summary').focus({ preventScroll: true });
});
$('#research-more').addEventListener('click', () => {
  researchLimit += 24;
  renderResearchExplorer();
});
function closeRecordDialog() {
  const dialog = $('#record-dialog');
  if (dialog.open) dialog.close();
}

$('#record-dialog .dialog-close').addEventListener('click', closeRecordDialog);
$('#record-dialog').addEventListener('click', event => {
  const navigation = event.target.closest('[data-dialog-record]');
  if (navigation?.dataset.dialogRecord && canonicalRelease) {
    const record = canonicalRelease.records.find(item => item.id === navigation.dataset.dialogRecord);
    if (record) openResearchRecord(record, { preserveContext: true });
    return;
  }
  if (event.target === $('#record-dialog')) closeRecordDialog();
});
$('#record-dialog').addEventListener('close', () => {
  if (location.hash.startsWith('#research?record=')) history.replaceState(null, '', dialogReturnHash);
  const canReturnToTrigger = dialogTrigger?.isConnected
    && dialogTrigger !== document.body
    && dialogTrigger !== document.documentElement;
  const returnTarget = canReturnToTrigger ? dialogTrigger : $('#research-search');
  returnTarget?.focus({ preventScroll: true });
  dialogTrigger = null;
});
navToggle.addEventListener('click', () => {
  const open = navToggle.getAttribute('aria-expanded') === 'true';
  if (open) closePrimaryNavigation();
  else {
    navToggle.setAttribute('aria-expanded', 'true');
    navToggle.setAttribute('aria-label', 'Close main menu');
    primaryNav.classList.add('open');
    setNavigationIsolation(true);
    primaryNav.querySelector('a')?.focus();
  }
});
primaryNav.addEventListener('click', event => {
  if (!event.target.closest('a')) return;
  closePrimaryNavigation();
});
document.addEventListener('keydown', event => {
  trapPrimaryNavigationFocus(event);
  if (event.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
    closePrimaryNavigation({ restoreFocus: true });
  }
});
document.addEventListener('pointerdown', event => {
  if (navToggle.getAttribute('aria-expanded') !== 'true') return;
  if (!primaryNav.contains(event.target) && event.target !== navToggle) closePrimaryNavigation();
});
matchMedia('(min-width: 721px)').addEventListener('change', event => {
  if (event.matches) closePrimaryNavigation();
});
window.addEventListener('resize', updatePhase);
setupCurrentTaskTracking();

makePhaseMap();
if (location.hash.startsWith('#map')) applyMapState(parseMapHash(location.hash));
else updatePhase();
renderFilters();
renderRecords();
renderChallenges();
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
