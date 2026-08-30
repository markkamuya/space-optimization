import { ATLAS_RECORDS, OPEN_PROBLEMS, phaseAt } from './atlas/catalog.js';
import { normalizeProblem } from './core/problem.js';
import { renderPacking } from './rendering/canvas.js';
import { workshopKeyboardPatch, workshopPlacementAtPoint, workshopProblemPoint } from './ui/workshopInteraction.js';
import { escapeHtml, safeExternalUrl } from './ui/safeText.js';
import { validatePublicRelease } from './ui/releaseValidation.js';
import { loadIntegrityCheckedRelease } from './ui/shardedReleaseLoader.js';
import { describePhaseSelection, phaseGridDestination } from './ui/phaseGrid.js';
import { formatMapHash, parseMapHash } from './ui/mapState.js';
import { phaseMapDimensions, phaseMapRecords } from './ui/phaseOverview.js';
import { releaseExperience } from './ui/releaseExperience.js';
import { compareCanonicalRecords, comparisonOptionLabel } from './ui/comparisonModel.js';
import { boundedComparisonCandidates, buildComparisonGuides, comparisonMatchMessage } from './ui/comparisonFinder.js';
import { formatComparisonHash, parseComparisonHash, resolveComparisonState } from './ui/comparisonState.js';
import { formatResearchHash, parseResearchHash } from './ui/researchState.js';
import { buildResearchIndex, filterResearchIndex } from './ui/researchIndex.js';
import { browserCompatibility, listenForMediaChange } from './ui/browserCompatibility.js';
import { buildProvenanceJourney } from './ui/provenanceJourney.js';
import { createEvidenceBundle, validateEvidenceBundle } from './ui/evidenceBundle.js';
import { COMPARISON_WORKSPACE_LIMIT, restoreComparisonWorkspace, serializeComparisonWorkspace, updateComparisonWorkspace } from './ui/comparisonWorkspace.js';
import { comparisonReportSummary, createComparisonReport } from './ui/comparisonReport.js';
import { preflightContribution } from './ui/submissionPreflight.js';
import { contributionHandoff, createContributionStarter } from './ui/contributionStarter.js';
import { freshnessDelay, releaseFreshness } from './ui/releaseFreshness.js';
import { createResearchSession, restoreResearchSession } from './ui/researchSession.js';
import { registerOfflineCache, requestOfflineCacheStatus } from './ui/offlineCache.js';
import { runProductionDiagnostics } from './ui/productionDiagnostics.js';
import { parseCompassHash, setupPackingCompassShell } from './ui/packingCompassShell.js';
import { COMPASS_CONTAINER_OPTIONS, COMPASS_TRIANGLE_OPTIONS, compassEvidence, matchCompassQuestion } from './ui/packingCompass.js';
import { advancedOrientation } from './ui/advancedOrientation.js';
import { evidenceLadder, recordConclusion } from './ui/evidenceStory.js';
import { buildResearchTrail, createResearchTrailReport, researchTrailReportSummary } from './ui/researchTrail.js';
import { nextBestActions, parseResearchCommand } from './ui/nextBestAction.js';
import {
  addWorkshopPiece,
  createWorkshopBundle,
  createWorkshopCandidate,
  formatWorkshopHash,
  parseWorkshopHash,
  removeWorkshopPiece,
  restoreWorkshopBundle,
  updateWorkshopPlacement,
  updateWorkshopProvenance,
  validateWorkshopCandidate
} from './ui/packingWorkshop.js';

const $ = selector => document.querySelector(selector);
const percent = value => `${(value * 100).toFixed(1)}%`;
let familyFilter = 'all';
let selectedPhase = phaseAt(60, 1.5);
let selectedPhaseRecord = null;
let phaseMapView = 'overview';
let researchRelease = null;
let researchIndex = null;
let canonicalRelease = null;
let researchLimit = 24;
let researchRenderFrame = null;
let dialogTrigger = null;
let dialogReturnHash = '#research';
let researchLoadAttempt = 0;
let pendingInitialTaskAnchor = true;
let researchLoadController = null;
let releaseSource = null;
let releaseIntegrity = null;
let releasePhase = 'loading';
let releaseVerifiedAt = null;
let releaseVerifiedEpoch = null;
let releaseFreshnessTimer = null;
let releaseRecovery = null;
let workshopCandidate = null;
let workshopValidation = null;
let workshopBaselineId = null;
let workshopPlacementIndex = 0;
let workshopDrag = null;
let comparisonWorkspaceIds = [];
let comparisonWorkspaceStorage = 'available';
const comparisonRenderFrames = { a: null, b: null };
const comparisonWorkspaceKey = 'triangle-packing-atlas:comparison-workspace:v1';
const navToggle = $('#nav-toggle');
const primaryNav = $('#primary-nav');
const pageMain = $('#main-content');
const pageFooter = $('footer');
const brandLink = $('.brand');
const compatibility = browserCompatibility(globalThis);
const packingCompassShell = setupPackingCompassShell({ document, location, history });

function compassOptionMarkup(options) {
  return options.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join('');
}

function compassRecordMarkup(record) {
  const evidence = compassEvidence(record);
  return `<article class="compass-answer-card">
    <div class="compass-answer-heading"><span>${escapeHtml(evidence.label)}</span><h3>${escapeHtml(record.problem.name)}</h3><p>${escapeHtml(evidence.explanation)}</p></div>
    <dl><div><dt>Rectangle filled</dt><dd>${percent(record.verification.utilization)}</dd></div><div><dt>Triangles fitted</dt><dd>${record.verification.pieceCount}</dd></div><div><dt>Room for improvement</dt><dd>${percent(record.bounds.optimalityGap)}</dd></div></dl>
    <p class="compass-answer-pattern">Best verified method: <b>${escapeHtml(record.pattern)}</b></p>
    <nav aria-label="Continue with this answer"><a href="#research?record=${escapeHtml(record.id)}">Inspect why we trust this answer</a><a href="${escapeHtml(researchComparisonHref(record))}">Compare this result</a><a href="${record.evidence.state === 'proven_optimal' ? '#challenges' : escapeHtml(formatWorkshopHash(record.id))}">${record.evidence.state === 'proven_optimal' ? 'Explore open challenges' : 'Open in Packing Workshop'}</a></nav>
  </article>`;
}

function selectedWorkshopBaseline() {
  return canonicalRelease?.records.find(record => record.id === workshopBaselineId) ?? null;
}

function workshopStorageKey() {
  return workshopBaselineId ? `triangle-packing-atlas:workshop:v1:${workshopBaselineId}` : null;
}

function setWorkshopControls(enabled) {
  for (const selector of [
    '#workshop-baseline', '#workshop-placement', '#workshop-x', '#workshop-y', '#workshop-angle', '#workshop-reflect',
    '#workshop-apply', '#workshop-remove-piece', '#workshop-add-piece', '#workshop-contributor',
    '#workshop-method', '#workshop-version', '#workshop-seed', '#workshop-validate', '#workshop-save',
    '#workshop-recover', '#workshop-reset', '#workshop-file', '#workshop-export', '#workshop-copy-command'
  ]) $(selector).disabled = !enabled;
  for (const button of document.querySelectorAll('[data-workshop-nudge]')) button.disabled = !enabled;
  $('#workshop-canvas').setAttribute('aria-disabled', String(!enabled));
}

function applyWorkshopMetadata() {
  if (!workshopCandidate) return;
  workshopCandidate = updateWorkshopProvenance(workshopCandidate, {
    contributor: $('#workshop-contributor').value.trim(),
    generator: $('#workshop-method').value.trim(),
    version: $('#workshop-version').value.trim(),
    seed: $('#workshop-seed').value.trim(),
    runtimeMs: 0
  });
}

function renderWorkshopValidation() {
  const result = $('#workshop-validation-result');
  const github = $('#workshop-github');
  if (!workshopValidation) {
    result.className = 'workshop-validation-result';
    result.innerHTML = '<b>No local validation yet</b><p>Published evidence remains authoritative.</p>';
    $('#workshop-candidate-fill').textContent = '—';
    $('#workshop-fill-delta').textContent = '—';
    $('#workshop-findings').innerHTML = '<summary>Validation findings</summary><ul><li>Run local validation to inspect geometry and submission-readiness findings.</li></ul>';
    github.setAttribute('aria-disabled', 'true');
    return;
  }
  const validation = workshopValidation;
  result.className = `workshop-validation-result ${validation.eligibleForContribution ? 'ready' : validation.geometryValid ? 'valid' : 'failed'}`;
  result.innerHTML = `<b>${escapeHtml(validation.headline)}</b><p>${escapeHtml(validation.boundary)}</p>`;
  $('#workshop-candidate-fill').textContent = validation.geometryValid ? percent(validation.comparison.candidateUtilization) : 'Withheld — invalid geometry';
  $('#workshop-fill-delta').textContent = validation.geometryValid
    ? `${validation.comparison.delta >= 0 ? '+' : '−'}${percent(Math.abs(validation.comparison.delta))}`
    : '—';
  const findings = [
    ...validation.preflight.checks.filter(item => !item.passed).map(item => `${item.label}: ${item.detail}`),
    ...validation.assessment.verification.errors.map(item => `${item.code}: ${item.message}`)
  ];
  $('#workshop-findings').innerHTML = `<summary>Validation findings · ${findings.length}</summary><ul>${(findings.length ? findings : ['No local geometry or readiness failures were found. Independent verification and review are still required.']).slice(0, 30).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
  github.setAttribute('aria-disabled', String(!validation.eligibleForContribution));
  const claim = $('#workshop-claim-status');
  claim.className = `workshop-claim-status ${validation.eligibleForContribution ? 'candidate-improvement' : validation.geometryValid ? 'locally-valid' : 'invalid'}`;
  claim.innerHTML = `<b>${escapeHtml(validation.headline)}</b><span>${escapeHtml(validation.boundary)}</span>`;
}

function renderWorkshopCandidate({ resetMetadata = false } = {}) {
  const baseline = selectedWorkshopBaseline();
  if (!baseline || !workshopCandidate) return;
  workshopPlacementIndex = Math.min(workshopPlacementIndex, workshopCandidate.solution.placements.length - 1);
  const placementSelect = $('#workshop-placement');
  if (placementSelect.options.length !== workshopCandidate.solution.placements.length) {
    placementSelect.replaceChildren(...workshopCandidate.solution.placements.map((_, index) => new Option(`Triangle ${index + 1}`, String(index))));
  }
  placementSelect.value = String(workshopPlacementIndex);
  const placement = workshopCandidate.solution.placements[workshopPlacementIndex];
  $('#workshop-x').value = String(placement.x);
  $('#workshop-y').value = String(placement.y);
  $('#workshop-angle').value = String(placement.angle ?? 0);
  $('#workshop-reflect').checked = placement.reflect ?? false;
  $('#workshop-reflect').disabled = !baseline.problem.allowReflection;
  $('#workshop-remove-piece').disabled = workshopCandidate.solution.placements.length <= 1;
  $('#workshop-add-piece').disabled = workshopCandidate.solution.placements.length >= workshopCandidate.problem.maxPieces;
  $('#workshop-baseline-title').textContent = baseline.problem.name;
  $('#workshop-baseline-scope').textContent = `${baseline.id} · ${baseline.problem.width} × ${baseline.problem.height} container · release ${canonicalRelease.version}. The published coordinates remain read-only.`;
  $('#workshop-baseline-fill').textContent = percent(baseline.verification.utilization);
  $('#workshop-baseline-pieces').textContent = String(baseline.verification.pieceCount);
  $('#workshop-baseline-evidence').textContent = evidenceStoryLabel(baseline);
  $('#workshop-incumbent-fill').textContent = percent(baseline.verification.utilization);
  $('#workshop-canvas-summary').textContent = `Candidate based on ${baseline.id}, with ${workshopCandidate.solution.placements.length} triangles. It has not been accepted as valid or better until local validation passes.`;
  if (resetMetadata) {
    $('#workshop-contributor').value = workshopCandidate.provenance.contributor;
    $('#workshop-method').value = workshopCandidate.provenance.generator;
    $('#workshop-version').value = workshopCandidate.provenance.version;
    $('#workshop-seed').value = String(workshopCandidate.provenance.seed);
  }
  requestAnimationFrame(() => renderPacking(
    $('#workshop-canvas'),
    normalizeProblem(workshopCandidate.problem),
    { state: workshopCandidate.solution.placements, showLabels: false, selectedIndex: workshopPlacementIndex }
  ));
  renderWorkshopValidation();
}

function markWorkshopDirty(message) {
  workshopValidation = null;
  const claim = $('#workshop-claim-status');
  claim.className = 'workshop-claim-status untested';
  claim.innerHTML = '<b>Unvalidated candidate</b><span>Coordinates changed. Run local validation before drawing any conclusion.</span>';
  $('#workshop-editor-status').textContent = message;
  renderWorkshopCandidate();
}

function startWorkshop(baselineId, { updateHash = false } = {}) {
  const baseline = canonicalRelease?.records.find(record => record.id === baselineId);
  if (!baseline) return;
  workshopBaselineId = baseline.id;
  workshopPlacementIndex = 0;
  workshopCandidate = createWorkshopCandidate(baseline);
  workshopValidation = null;
  $('#workshop-baseline').value = baseline.id;
  $('.workshop-layout').setAttribute('aria-busy', 'false');
  setWorkshopControls(true);
  $('#workshop-reflect').disabled = !baseline.problem.allowReflection;
  $('#workshop-release-status').textContent = `Verified baseline ${baseline.id} loaded from release ${canonicalRelease.version}. All edits remain local to this browser.`;
  $('#workshop-editor-status').textContent = baseline.problem.maxPieces <= baseline.solution.placements.length
    ? `All ${baseline.problem.maxPieces} allowed piece slots are already used. Rearranging coordinates can restore validity but cannot increase fill without a reviewable change to the problem contract.`
    : 'Select a triangle and adjust its coordinates.';
  renderWorkshopCandidate({ resetMetadata: true });
  if (updateHash) history.pushState(null, '', formatWorkshopHash(baseline.id));
}

function setupPackingWorkshop() {
  const select = $('#workshop-baseline');
  select.replaceChildren(...canonicalRelease.records.map(record => new Option(comparisonOptionLabel(record), record.id)));
  const linked = parseWorkshopHash(location.hash).record;
  const fallback = canonicalRelease.records.find(record => record.evidence.state !== 'proven_optimal' && record.bounds.optimalityGap > 0) ?? canonicalRelease.records[0];
  startWorkshop(canonicalRelease.records.some(record => record.id === linked) ? linked : fallback.id);
}

function syncPackingWorkshopFromLocation() {
  if (!canonicalRelease || !location.hash.startsWith('#workshop')) return;
  const linked = parseWorkshopHash(location.hash).record;
  if (linked && linked !== workshopBaselineId && canonicalRelease.records.some(record => record.id === linked)) startWorkshop(linked);
}

function renderPackingCompassAnswer(question) {
  const answer = matchCompassQuestion(canonicalRelease?.records, question);
  const answerRegion = $('#compass-answer');
  if (!answer.records.length) {
    answerRegion.innerHTML = '<div class="compass-answer-empty" role="alert"><h3>No verified answer is available.</h3><p>Change one choice or open Advanced mode. The Atlas will not substitute modeled or unverified data.</p></div>';
  } else {
    const pairAction = answer.records.length === 2
      ? `<a class="compass-pair-action" href="${escapeHtml(formatComparisonHash({ left: answer.records[0].id, right: answer.records[1].id }))}">Compare these two verified results</a>`
      : '';
    answerRegion.innerHTML = `<p class="kicker">${answer.records.length === 2 ? 'TWO VERIFIED RESULTS' : 'MATCHING VERIFIED ANSWER'}</p><p class="compass-answer-scope">Your plain-language choices identify a nearby sampled Atlas problem. Evidence statements apply only to each exact triangle and rectangle shown below.</p>${answer.records.map(compassRecordMarkup).join('')}${pairAction}`;
  }
  answerRegion.hidden = false;
  answerRegion.focus({ preventScroll: true });
}

function renderPackingCompassQuestion(goal) {
  const slot = $('#compass-question-slot');
  const releaseStatus = $('#compass-release-status');
  if (!canonicalRelease || releasePhase !== 'ready') {
    releaseStatus.textContent = releasePhase === 'failed'
      ? 'Verified Atlas data is unavailable. Guided answers are withheld until integrity checks recover.'
      : 'Checking the verified Atlas release before answering a research question…';
    slot.innerHTML = '<p>Guided controls remain unavailable until the release passes integrity checks. No modeled answer will be shown as verified.</p>';
    return;
  }
  releaseStatus.textContent = `${canonicalRelease.coverage.records} verified records are ready. Answers are matched only against release ${canonicalRelease.version}.`;
  if (!goal) {
    slot.innerHTML = '<p>Choose one goal above. Then make two plain-language choices to receive a verified answer.</p>';
    return;
  }
  const defaults = goal === 'improve'
    ? { triangle: 'obtuse', container: 'wide' }
    : goal === 'verify'
      ? { triangle: 'right', container: 'tall' }
      : { triangle: 'equilateral', container: 'balanced' };
  slot.innerHTML = `<form id="compass-question-form">
    <label>What kind of triangle?<select name="triangle">${compassOptionMarkup(COMPASS_TRIANGLE_OPTIONS)}</select></label>
    <label>What kind of rectangle?<select name="container">${compassOptionMarkup(COMPASS_CONTAINER_OPTIONS)}</select></label>
    <button type="submit">${goal === 'compare' ? 'Show two verified results' : 'Show my verified answer'}</button>
  </form><p class="compass-question-note">These choices select an existing Atlas problem. They do not change its coordinates, proof status, or evidence.</p>
  <section id="compass-answer" class="compass-answer" tabindex="-1" aria-label="Packing Compass answer" hidden></section>`;
  slot.querySelector('[name="triangle"]').value = defaults.triangle;
  slot.querySelector('[name="container"]').value = defaults.container;
  slot.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    renderPackingCompassAnswer({ goal, triangle: data.get('triangle'), container: data.get('container') });
  });
}

window.addEventListener('packing-compass:goal', event => renderPackingCompassQuestion(event.detail.goal));
window.addEventListener('atlas:location', () => {
  renderAdvancedOrientation();
  syncPackingWorkshopFromLocation();
});
let offlineCacheSupported = false;
let offlineFallbackActive = false;

async function renderOfflineReadiness(message = '') {
  const panel = $('#offline-readiness');
  const status = $('#offline-readiness-status');
  if (!offlineCacheSupported) {
    panel.className = 'offline-readiness';
    status.textContent = message || 'Offline reopening is unavailable in this browser. Online verified workflows are unaffected.';
    return;
  }
  if ((!navigator.onLine || offlineFallbackActive) && canonicalRelease) {
    panel.className = 'offline-readiness offline';
    status.textContent = 'Offline: cached release bytes passed integrity checks in this session. Reconnect to check for a newer release.';
    return;
  }
  const cache = await requestOfflineCacheStatus();
  panel.className = `offline-readiness ${cache.available ? 'ready' : ''}`;
  status.textContent = message || (cache.available
    ? `${cache.entries} Atlas resources are cached. Offline reload will still recheck every required release artifact and fail closed if any are missing.`
    : 'Offline support is installed but this page is not controlled yet. Reload online once to prepare a verified offline copy.');
}

async function setupOfflineMode() {
  const result = await registerOfflineCache();
  offlineCacheSupported = result.supported;
  await renderOfflineReadiness(result.reason === 'registration_failed' ? 'Offline support could not be installed. Online verified workflows are unaffected.' : '');
  navigator.serviceWorker?.addEventListener('message', event => {
    if (event.data?.type !== 'ATLAS_OFFLINE_FALLBACK') return;
    offlineFallbackActive = true;
    renderOfflineReadiness('Network access is unavailable. Cached Atlas files are being rechecked before any research result is trusted.');
  });
}

function renderBrowserCompatibility() {
  document.body.dataset.browserCompatibility = compatibility.supported ? 'supported' : 'degraded';
  $('#browser-runtime-status').textContent = compatibility.supported
    ? 'This browser passed the Atlas verification and interaction capability check.'
    : compatibility.message;
  if (compatibility.supported) return;
  const notice = $('#browser-compatibility');
  notice.hidden = false;
  notice.innerHTML = `<strong>Browser update required</strong><span>${compatibility.message}</span>`;
}

function renderProductionDiagnostics({ focus = false } = {}) {
  const report = runProductionDiagnostics(document);
  const labels = {
    semanticWorkflows: 'Named research workflows', verifiedRelease: 'Verified release loaded', keyboardFocus: 'Keyboard focus support',
    dialogSemantics: 'Result dialog semantics', canvasAlternatives: 'Canvas text alternatives', viewportFit: 'No page overflow',
    integrityPrimitives: 'Integrity-check primitives', recoveryControls: 'Recovery controls'
  };
  $('#browser-diagnostics-results').innerHTML = Object.entries(report.gates)
    .map(([gate, passed]) => `<li class="${passed ? 'passed' : 'failed'}">${labels[gate]}</li>`).join('');
  const status = $('#browser-diagnostics-status');
  status.textContent = report.passed
    ? 'This browser passed every live Atlas workflow diagnostic.'
    : `${report.failures.length} live diagnostic${report.failures.length === 1 ? '' : 's'} need attention. Verified data remains fail-closed.`;
  if (focus) status.focus({ preventScroll: true });
  return report;
}

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
  const last = links[links.length - 1];
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
  if (typeof IntersectionObserver !== 'function') {
    const linkedSection = sections.find(section => location.hash.startsWith(`#${section.id}`));
    if (linkedSection) setCurrentNavigationTask(linkedSection.id);
    return;
  }
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
  const freshness = releaseFreshness(releaseVerifiedEpoch, Date.now(), navigator.onLine);
  const experience = releaseExperience({
    phase,
    hasVerifiedRelease: Boolean(canonicalRelease),
    source: releaseSource,
    online: navigator.onLine,
    verifiedAt: releaseVerifiedAt,
    freshness
  });
  const mapStatus = $('#map-data-status');
  mapStatus.className = `map-data-status ${experience.mode}`;
  mapStatus.dataset.releaseState = experience.mode;
  mapStatus.dataset.releaseTrust = experience.trust;
  const message = document.createElement('div');
  const headline = document.createElement('b');
  const detail = document.createElement('span');
  headline.textContent = experience.headline;
  detail.textContent = experience.detail;
  const label = document.createElement('strong');
  label.className = 'release-state-label';
  label.textContent = experience.label;
  const provenance = document.createElement('small');
  provenance.className = 'release-provenance';
  provenance.textContent = experience.provenance;
  message.append(label, headline, detail, provenance);
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

function scheduleReleaseFreshnessCheck() {
  clearTimeout(releaseFreshnessTimer);
  const delay = freshnessDelay(releaseVerifiedEpoch);
  if (delay === null) return;
  releaseFreshnessTimer = setTimeout(() => {
    if (document.visibilityState === 'visible' && canonicalRelease && releasePhase === 'ready') {
      const experience = renderReleaseExperience('ready');
      renderResearchReleaseStatus(experience, 'The last verified data remains available. Recheck when convenient to learn whether a newer release exists.');
    }
  }, delay + 50);
}

function refreshLongSessionStatus() {
  if (document.visibilityState !== 'visible' || !canonicalRelease || releasePhase !== 'ready') return;
  const experience = renderReleaseExperience('ready');
  if (experience.mode === 'recheck_due') {
    renderResearchReleaseStatus(experience, 'The last verified data remains available. Recheck when convenient to learn whether a newer release exists.');
  }
  scheduleReleaseFreshnessCheck();
}

function renderResearchReleaseStatus(experience, detail = experience.detail) {
  const status = $('#research-load-status');
  status.className = `research-load-status ${experience.mode}`;
  status.dataset.releaseState = experience.mode;
  status.dataset.releaseTrust = experience.trust;
  status.innerHTML = `<strong class="release-state-label">${experience.label}</strong><b>${experience.headline}</b><span>${detail}</span><small class="release-provenance">${experience.provenance}</small>`;
  if (experience.canRetry) {
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.dataset.retryRelease = '';
    retry.textContent = experience.mode.startsWith('verified_') ? 'Check for release updates' : 'Retry verified data';
    status.append(retry);
  }
  $('#comparison').dataset.releaseTrust = experience.trust;
  return status;
}

function renderReleaseProgress(progress) {
  const status = $('#research-load-status');
  const label = document.createElement('label');
  label.className = 'release-progress';
  label.textContent = `${progress.loadedRecords} of ${progress.totalRecords} verified records checked`;
  const meter = document.createElement('progress');
  meter.max = progress.totalRecords;
  meter.value = progress.loadedRecords;
  label.append(meter);
  status.append(label);
}

function finishReleaseRecovery(succeeded) {
  if (!releaseRecovery) return '';
  const { manual, target, reason } = releaseRecovery;
  releaseRecovery = null;
  if (manual) requestAnimationFrame(() => $(target)?.focus({ preventScroll: true }));
  if (!succeeded) return reason === 'reconnected' ? 'Connection restored, but verification failed. ' : 'Retry unsuccessful. ';
  return reason === 'reconnected' ? 'Connection restored. Recovery complete. ' : 'Recovery complete. ';
}

function startReleaseRecovery({ manual = false, target = '#research-load-status', reason = 'retry' } = {}) {
  releaseRecovery = { manual, target, reason };
  loadResearchRelease();
  if (manual) requestAnimationFrame(() => $(target)?.focus({ preventScroll: true }));
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
  renderAdvancedOrientation();
  renderResearchTrail();
  renderNextBestActions();
  if (historyMode) history[`${historyMode}State`](null, '', formatMapHash(currentMapState()));
}

function renderAdvancedOrientation() {
  const view = advancedOrientation({
    hash: location.hash,
    angle: Number($('#angle').value),
    ratio: Number($('#ratio').value),
    record: selectedPhaseRecord,
    releaseReady: releasePhase === 'ready'
  });
  $('#advanced-orientation-title').textContent = `${view.stage}: understand this exact problem`;
  $('#advanced-orientation-guidance').textContent = view.guidance;
  $('#advanced-orientation-problem').textContent = view.problem;
  $('#advanced-orientation-sample').textContent = view.sample;
  $('#advanced-orientation-evidence').textContent = view.evidence;
  const action = $('#advanced-orientation-action');
  action.href = view.recordId ? `#research?record=${encodeURIComponent(view.recordId)}` : '#map';
  action.textContent = view.recordId ? 'Inspect this sample’s evidence' : 'Return to the packing map';
}

function currentResearchTrail() {
  const linkedResearch = parseResearchHash(location.hash);
  return buildResearchTrail({
    map: currentMapState(),
    research: currentResearchState(),
    comparison: canonicalRelease ? currentComparisonState() : {},
    activeRecord: location.hash.startsWith('#research') ? linkedResearch.record : null,
    includeComparison: location.hash.startsWith('#compare'),
    verified: releasePhase === 'ready' && Boolean(canonicalRelease && releaseIntegrity?.digest)
  });
}

function renderResearchTrail() {
  const trail = currentResearchTrail();
  $('#research-trail-status').textContent = trail.status;
  $('#research-trail-steps').innerHTML = trail.steps.map(step => `<li><a href="${escapeHtml(step.href)}"><b>${escapeHtml(step.label)}</b><span>${escapeHtml(step.value)}</span></a></li>`).join('');
  $('#research-trail-copy').disabled = !trail.verified;
  $('#research-trail-download').disabled = !trail.verified;
  return trail;
}

function renderNextBestActions() {
  const list = $('#next-best-action-list');
  if (!canonicalRelease || releasePhase !== 'ready' || !selectedPhaseRecord) {
    $('#next-best-action-status').textContent = 'Recommendations are withheld until a verified record and release identity are available.';
    list.innerHTML = '<p>Waiting for integrity-checked records.</p>';
    return;
  }
  const actions = nextBestActions(canonicalRelease.records, selectedPhaseRecord);
  $('#next-best-action-status').textContent = `Suggestions are based only on ${selectedPhaseRecord.id} and verified release ${canonicalRelease.version}.`;
  list.innerHTML = actions.map(action => {
    const href = action.kind === 'research'
      ? formatResearchHash({ query: '', family: 'all', evidence: 'all', record: action.recordId })
      : action.kind === 'compare'
        ? formatComparisonHash({ left: action.left, right: action.right })
        : '#contribute';
    return `<a href="${escapeHtml(href)}"><b>${escapeHtml(action.label)}</b><span>${escapeHtml(action.description)}</span></a>`;
  }).join('');
}

function currentResearchTrailReport() {
  const trail = currentResearchTrail();
  const ids = new Set();
  const linked = parseResearchHash(location.hash).record;
  if (linked) ids.add(linked);
  if (location.hash.startsWith('#compare')) {
    const comparison = currentComparisonState();
    ids.add(comparison.left);
    ids.add(comparison.right);
  }
  return createResearchTrailReport(trail, {
    release: canonicalRelease,
    integrity: releaseIntegrity,
    records: canonicalRelease?.records.filter(record => ids.has(record.id)) ?? []
  });
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
    <article aria-labelledby="comparison-record-${index}"><span>${escapeHtml(evidenceStoryLabel(record))}</span><small>Result ${index === 0 ? 'A' : 'B'} · ${escapeHtml(record.experimentId)}</small><h3 id="comparison-record-${index}">${escapeHtml(record.pattern)}</h3>
      <div class="comparison-bar"><i style="width:${percent(record.verification.utilization)}"></i></div>
      <dl><div><dt>Verified fill</dt><dd>${percent(record.verification.utilization)}</dd></div><div><dt>Verified pieces</dt><dd>${record.verification.pieceCount}</dd></div><div><dt>Room for improvement</dt><dd>${percent(record.bounds.optimalityGap)}</dd></div><div><dt>Numerical stability</dt><dd>${escapeHtml(stabilityLabel(record.verification.stability))}</dd></div></dl>
      <a href="${formatResearchHash({ query: '', family: 'all', evidence: 'all', record: record.id })}">Inspect result ${index === 0 ? 'A' : 'B'} evidence</a>
    </article>`).join('');
  const fillDifference = Math.abs(result.utilizationDelta);
  const gapDifference = Math.abs(result.gapDelta);
  const fillLead = result.higherFill === 'tie' ? 'Both results have the same verified fill.' : `Result ${result.higherFill === 'left' ? 'A' : 'B'} fills ${percent(fillDifference)} more of its rectangle.`;
  const gapLead = result.smallerGap === 'tie' ? 'Both results have the same optimality gap.' : `Result ${result.smallerGap === 'left' ? 'A' : 'B'} has ${percent(gapDifference)} less room for improvement.`;
  $('#comparison-summary').textContent = `${fillLead} ${gapLead} Different triangle and rectangle sizes can make piece counts non-comparable.`;
  renderResearchTrail();
}

function persistComparisonWorkspace(message) {
  try {
    localStorage.setItem(comparisonWorkspaceKey, serializeComparisonWorkspace(
      comparisonWorkspaceIds,
      canonicalRelease.records.map(record => record.id),
      canonicalRelease.version
    ));
    comparisonWorkspaceStorage = 'available';
  } catch {
    comparisonWorkspaceStorage = 'unavailable';
  }
  renderComparisonWorkspace(message);
}

function renderComparisonWorkspace(message = '') {
  if (!canonicalRelease) return;
  const list = $('#comparison-workspace-list');
  list.innerHTML = comparisonWorkspaceIds.length ? comparisonWorkspaceIds.map((id, index) => {
    const record = canonicalRelease.records.find(item => item.id === id);
    return `<li data-workspace-record="${escapeHtml(id)}"><div><b>${escapeHtml(comparisonOptionLabel(record))}</b><span>${escapeHtml(evidenceStoryLabel(record))}</span></div>
      <div class="workspace-record-actions"><button type="button" data-workspace-use="a" aria-label="Use ${escapeHtml(id)} as result A">A</button><button type="button" data-workspace-use="b" aria-label="Use ${escapeHtml(id)} as result B">B</button><button type="button" data-workspace-action="up" aria-label="Move ${escapeHtml(id)} earlier" ${index === 0 ? 'disabled' : ''}>↑</button><button type="button" data-workspace-action="down" aria-label="Move ${escapeHtml(id)} later" ${index === comparisonWorkspaceIds.length - 1 ? 'disabled' : ''}>↓</button><button type="button" data-workspace-action="remove" aria-label="Remove ${escapeHtml(id)} from shortlist">×</button></div></li>`;
  }).join('') : '<li class="workspace-empty">No saved records yet. Save result A or B to build a shortlist.</li>';
  const storageNote = comparisonWorkspaceStorage === 'unavailable'
    ? ' Browser storage is unavailable, so this shortlist lasts only until the page closes.'
    : ' This shortlist is saved in this browser.';
  $('#comparison-workspace-status').textContent = `${message || `${comparisonWorkspaceIds.length} of ${COMPARISON_WORKSPACE_LIMIT} records saved.`}${storageNote}`;
}

function restoreSavedComparisonWorkspace() {
  let raw = null;
  try { raw = localStorage.getItem(comparisonWorkspaceKey); } catch { comparisonWorkspaceStorage = 'unavailable'; }
  const restored = restoreComparisonWorkspace(raw, canonicalRelease.records.map(record => record.id), canonicalRelease.version);
  comparisonWorkspaceIds = restored.ids;
  const recovery = restored.status === 'invalid'
    ? 'The saved shortlist was unreadable and was reset safely.'
    : restored.removed
      ? `${restored.removed} saved record${restored.removed === 1 ? '' : 's'} no longer exist in this verified release and were removed.`
      : restored.status === 'release_updated'
        ? 'The shortlist was checked against the new release and every saved record remains available.'
        : '';
  if (restored.status === 'invalid' || restored.removed || restored.status === 'release_updated') persistComparisonWorkspace(recovery);
  else renderComparisonWorkspace(recovery);
}

function saveComparisonRecord(side) {
  const id = $(`#compare-${side}`).value;
  const before = comparisonWorkspaceIds.length;
  comparisonWorkspaceIds = updateComparisonWorkspace(comparisonWorkspaceIds, 'add', id);
  persistComparisonWorkspace(comparisonWorkspaceIds.length === before
    ? (comparisonWorkspaceIds.includes(id) ? 'That record is already in the shortlist.' : `The shortlist is full at ${COMPARISON_WORKSPACE_LIMIT} records.`)
    : `${id} was added to the shortlist.`);
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
  const candidateWindow = boundedComparisonCandidates(canonicalRelease.records, search.value);
  const matches = candidateWindow.visible;
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
    matches: candidateWindow.total,
    total: canonicalRelease.records.length,
    retained: Boolean(selected),
    shown: matches.length
  });
}

function scheduleComparisonCandidates(side) {
  if (comparisonRenderFrames[side] !== null) cancelAnimationFrame(comparisonRenderFrames[side]);
  comparisonRenderFrames[side] = requestAnimationFrame(() => {
    comparisonRenderFrames[side] = null;
    renderComparisonCandidates(side);
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
    search.oninput = () => scheduleComparisonCandidates(side);
    select.onchange = () => {
      select.dataset.selectedId = select.value;
      updateComparison();
    };
  }
  for (const selector of ['#comparison-swap', '#comparison-reset', '#comparison-share', '#comparison-copy-report', '#comparison-download']) $(selector).disabled = false;
  for (const selector of ['#comparison-save-a', '#comparison-save-b']) $(selector).disabled = false;
  restoreSavedComparisonWorkspace();
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
  for (const selector of ['#comparison-swap', '#comparison-reset', '#comparison-share', '#comparison-copy-report', '#comparison-download', '#comparison-save-a', '#comparison-save-b']) $(selector).disabled = true;
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
  if (!navigator.onLine && !navigator.serviceWorker?.controller) {
    showOfflineExperience();
    return;
  }
  const attempt = ++researchLoadAttempt;
  researchLoadController?.abort();
  researchLoadController = new AbortController();
  const status = $('#research-load-status');
  const retainingVerifiedRelease = Boolean(canonicalRelease && researchRelease);
  releasePhase = 'loading';
  const loadingExperience = renderReleaseExperience('loading');
  if (!retainingVerifiedRelease) {
    canonicalRelease = null;
    researchRelease = null;
    releaseSource = null;
    releaseIntegrity = null;
    makePhaseMap();
    updatePhase();
  }
  $('#research-results').setAttribute('aria-busy', 'true');
  if (retainingVerifiedRelease) {
    renderResearchReleaseStatus(loadingExperience, 'The last verified results remain available during this integrity check.');
  } else {
    $('#research-results').innerHTML = '<p class="research-loading">Preparing verified records…</p>';
    $('#research-result-count').textContent = 'Loading canonical release…';
    $('#research-more').hidden = true;
    renderResearchReleaseStatus(loadingExperience, 'Checking release integrity before results are shown.');
  }
  try {
    const loaded = await loadIntegrityCheckedRelease({
      signal: researchLoadController.signal,
      onProgress: progress => {
        if (attempt !== researchLoadAttempt) return;
        $('#resolution-label').textContent = `verified ${progress.loadedRecords} records from ${progress.loadedShards}/${progress.totalShards} shards…`;
        renderResearchReleaseStatus(loadingExperience, `${progress.loadedRecords} records checked from ${progress.loadedShards} of ${progress.totalShards} release shards.`);
        renderReleaseProgress(progress);
      }
    });
    if (attempt !== researchLoadAttempt) return;
    const release = loaded.release;
    const validation = validatePublicRelease(release);
    if (!validation.valid) throw new Error(`Invalid public release: ${validation.errors[0]}`);
    canonicalRelease = release;
    releaseSource = loaded.source;
    releaseIntegrity = loaded.integrity;
    releasePhase = 'ready';
    releaseVerifiedAt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date());
    releaseVerifiedEpoch = Date.now();
    scheduleReleaseFreshnessCheck();
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
    researchIndex = buildResearchIndex(canonicalRelease.records);
    $('#record-count').textContent = String(researchRelease.verifiedCount);
    makePhaseMap();
    updatePhase();
    renderLeaderboard();
    setupComparison();
    setupContributionPreflight();
    setupPackingWorkshop();
    $('#session-download').disabled = false;
    $('#session-file').disabled = false;
    $('#session-status').textContent = 'Ready to save or restore this verified research context.';
    applyResearchState(parseResearchHash(location.hash));
    renderResearchExplorer();
    const readyExperience = renderReleaseExperience('ready');
    const recoveryMessage = finishReleaseRecovery(true);
    renderResearchReleaseStatus(readyExperience, recoveryMessage + (loaded.source === 'verified_shards'
      ? `${canonicalRelease.coverage.records} records passed integrity checks from the canonical release shards.`
      : `${canonicalRelease.coverage.records} records passed the canonical checksum after a shard was unavailable. No partial shard data is shown.`));
    await renderOfflineReadiness();
    renderProductionDiagnostics();
    renderPackingCompassQuestion(parseCompassHash(location.hash).goal);
    restoreInitialTaskAnchor();
  } catch (error) {
    if (attempt !== researchLoadAttempt || error.name === 'AbortError') return;
    releasePhase = 'failed';
    if (retainingVerifiedRelease) {
      $('#research-results').setAttribute('aria-busy', 'false');
      renderResearchExplorer();
      const failureMessage = finishReleaseRecovery(false);
      const failedExperience = renderReleaseExperience('failed');
      renderResearchReleaseStatus(failedExperience, failureMessage + failedExperience.detail);
      return;
    }
    $('#resolution-label').textContent = 'verified dataset unavailable';
    $('#research-result-count').textContent = 'The verified dataset could not be loaded safely. Try refreshing the page.';
    $('#research-results').setAttribute('aria-busy', 'false');
    $('#research-results').innerHTML = '<div class="load-error" role="alert"><h3>Verified results are temporarily unavailable.</h3><p>The release failed availability or integrity checks. Research records remain hidden so partial or unverified data is never presented as trustworthy.</p><button type="button" data-retry-release>Try loading verified data again</button></div>';
    $('#research-more').hidden = true;
    const failureMessage = finishReleaseRecovery(false);
    renderResearchReleaseStatus(renderReleaseExperience('failed'), `${failureMessage}No research records were displayed. You can retry without reloading the page.`);
    setComparisonUnavailable('Verified comparison records are temporarily unavailable.');
    makePhaseMap();
    updatePhase();
    restoreInitialTaskAnchor();
  }
}

function showOfflineExperience() {
  researchLoadController?.abort();
  releasePhase = canonicalRelease ? 'ready' : 'failed';
  const status = $('#research-load-status');
  $('#research-results').setAttribute('aria-busy', 'false');
  const offlineExperience = renderReleaseExperience(releasePhase);
  if (canonicalRelease) {
    renderResearchReleaseStatus(offlineExperience, 'Reconnect to check whether a newer verified release is available.');
  } else {
    $('#research-result-count').textContent = 'Verified evidence is unavailable while offline.';
    $('#research-results').innerHTML = '<div class="load-error" role="alert"><h3>You appear to be offline.</h3><p>No verified research records are shown. Reconnect and the Atlas will retry automatically.</p></div>';
    $('#research-more').hidden = true;
    renderResearchReleaseStatus(offlineExperience, 'The map is a modeled preview until verified data can be checked.');
    setComparisonUnavailable('Verified comparison records are unavailable while offline.');
  }
  restoreInitialTaskAnchor();
}

function renderContributionPreflight(report) {
  const results = $('#contribution-preflight-results');
  results.innerHTML = `<div class="preflight-outcome ${report.readyForFullVerification ? 'ready' : 'needs-work'}"><b>${report.readyForFullVerification ? 'Ready for full local verification' : 'Needs work before full verification'}</b><p>${escapeHtml(report.boundary)}</p></div>
    <ol>${report.checks.map(item => `<li class="${item.passed ? 'passed' : 'failed'}"><span aria-hidden="true">${item.passed ? '✓' : '!'}</span><div><b>${escapeHtml(item.label)}</b><p>${escapeHtml(item.detail)}</p></div></li>`).join('')}</ol>
    ${report.schemaErrors.length ? `<details><summary>${report.schemaErrors.length} structural issue${report.schemaErrors.length === 1 ? '' : 's'}</summary><ul>${report.schemaErrors.slice(0, 20).map(error => `<li><code>${escapeHtml(error.path || 'record')}</code>: ${escapeHtml(error.message)}</li>`).join('')}</ul></details>` : ''}`;
}

function setupContributionPreflight() {
  const select = $('#contribution-baseline');
  const input = $('#contribution-file');
  select.replaceChildren(...canonicalRelease.records.map(record => new Option(comparisonOptionLabel(record), record.id)));
  select.value = currentComparisonState().right;
  select.disabled = false;
  input.disabled = false;
  $('#contribution-starter-download').disabled = false;
  $('#contribution-command-copy').disabled = false;
  $('#contribution-preflight-status').textContent = 'Choose a proposed record JSON file up to 10 MB. Nothing is uploaded.';
  renderContributionHandoff();
}

function selectedContributionBaseline() {
  return canonicalRelease?.records.find(record => record.id === $('#contribution-baseline').value);
}

function renderContributionHandoff() {
  const baseline = selectedContributionBaseline();
  if (!baseline) return;
  const handoff = contributionHandoff(baseline);
  $('#contribution-handoff-steps').innerHTML = handoff.steps.map(step => `<li>${escapeHtml(step)}</li>`).join('');
  $('#contribution-starter-status').textContent = `Starter target: ${handoff.filename}. It begins as a duplicate of ${baseline.id} and must be improved.`;
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
  return filterResearchIndex(researchIndex, { query, family, evidence });
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

function researchProvenanceChain(record) {
  const stages = buildProvenanceJourney(record, canonicalRelease, releaseIntegrity, releaseSource);
  return `<section class="provenance-panel" aria-labelledby="provenance-title">
    <div class="provenance-heading"><p class="kicker">Evidence chain</p><h3 id="provenance-title">How this claim can be trusted</h3><p>Follow each stage from the research identity to the exact integrity-checked public release.</p></div>
    <ol class="provenance-chain">${stages.map((stage, index) => `<li>
      <span class="provenance-step" aria-hidden="true">${index + 1}</span>
      <div><h4>${escapeHtml(stage.label)}</h4><p>${escapeHtml(stage.description)}</p><code>${escapeHtml(stage.value)}</code></div>
    </li>`).join('')}</ol>
  </section>`;
}

function evidenceStoryLabel(record) {
  return recordConclusion(record)?.label ?? 'Candidate';
}

function researchEvidenceStory(record) {
  const conclusion = recordConclusion(record);
  if (!conclusion) return '<section class="record-conclusion" role="alert"><h3>Evidence conclusion unavailable</h3><p>This record is not shown as verified because its evidence fields are incomplete.</p></section>';
  const ladder = evidenceLadder(conclusion.state);
  return `<section class="record-conclusion" aria-labelledby="record-conclusion-title">
    <div class="record-conclusion-heading"><p class="kicker">SAFE CONCLUSION</p><h3 id="record-conclusion-title">${escapeHtml(conclusion.label)} for this exact problem</h3><p>Read the claim and its limits before using this result.</p></div>
    <ol class="record-evidence-ladder" aria-label="Evidence level reached">${ladder.map(step => `<li class="${step.reached ? 'reached' : ''} ${step.current ? 'current' : ''}" ${step.current ? 'aria-current="step"' : ''}><b>${escapeHtml(step.label)}</b><span>${escapeHtml(step.description)}</span></li>`).join('')}</ol>
    <dl class="record-conclusion-answers">
      <div><dt>What is proven?</dt><dd>${escapeHtml(conclusion.whatIsProven)}</dd></div>
      <div><dt>What remains unknown?</dt><dd>${escapeHtml(conclusion.whatIsUnknown)}</dd></div>
      <div><dt>Why do we trust this?</dt><dd>${escapeHtml(conclusion.whyTrusted)}</dd></div>
    </dl>
  </section>`;
}

function researchReproductionTools(record) {
  return `<section class="reproduction-panel" aria-labelledby="reproduction-tools-title">
    <div><p class="kicker">Reproduction tools</p><h3 id="reproduction-tools-title">Take this evidence with you</h3><p>Copy the deterministic command, download only this record and its verified release identity, then re-import that file here to check it has not changed.</p></div>
    <div class="reproduction-actions" role="group" aria-label="Record evidence actions">
      <button type="button" data-copy-evidence-command="${escapeHtml(record.id)}">Copy reproduction command</button>
      <button type="button" data-download-evidence="${escapeHtml(record.id)}">Download evidence package</button>
      <label>Validate an evidence package<input type="file" accept="application/json,.json" data-validate-evidence="${escapeHtml(record.id)}"></label>
    </div>
    <p class="reproduction-status" data-evidence-status role="status" aria-live="polite">Ready to export verified evidence for ${escapeHtml(record.id)}.</p>
  </section>`;
}

function openResearchRecord(record, { preserveContext = false } = {}) {
  if (!preserveContext) {
    dialogTrigger = document.activeElement;
    dialogReturnHash = formatResearchHash(currentResearchState());
  }
  const detail = $('#record-detail');
  detail.innerHTML = `
    <div class="detail-header"><div><p class="kicker">${escapeHtml(record.family)} / ${escapeHtml(evidenceStoryLabel(record))}</p><h2 id="record-dialog-title">${escapeHtml(record.experimentId)}</h2><p id="record-dialog-summary">${escapeHtml(record.evidence.claim)}</p></div>
      <div class="detail-stat"><b>${percent(record.verification.utilization)}</b><span>verified lower bound</span></div></div>
    ${researchEvidenceStory(record)}
    <p id="record-visual-summary" class="sr-only">Packing diagram for ${escapeHtml(record.id)}: ${record.verification.pieceCount} triangles, ${percent(record.verification.utilization)} verified fill, and ${percent(record.bounds.optimalityGap)} room for improvement.</p>
    <canvas width="1000" height="560" role="img" aria-label="${escapeHtml(record.id)} packing coordinates" aria-describedby="record-visual-summary"></canvas>
    <div class="detail-grid">
      <section><h3>Verification certificate</h3><p><code>${escapeHtml(record.verification.certificate)}</code></p><dl><div><dt>Pieces</dt><dd>${record.verification.pieceCount}</dd></div><div><dt>Overlap</dt><dd>0</dd></div><div><dt>Numerical stability</dt><dd>${escapeHtml(stabilityLabel(record.verification.stability))}</dd></div><div><dt>Verifier</dt><dd>${escapeHtml(record.verification.verifier)}</dd></div></dl></section>
      <section><h3>Best result and proven limit</h3><dl><div><dt>Verified fill</dt><dd>${percent(record.bounds.lowerBound)}</dd></div><div><dt>Proven maximum</dt><dd>${percent(record.bounds.upperBound)}</dd></div><div><dt>Room for improvement</dt><dd>${percent(record.bounds.optimalityGap)}</dd></div></dl><p>Priority for checking empty boundary space: ${escapeHtml(record.descriptors.boundaryGapAnalysis.priority)}.</p></section>
      <section><h3>Reproduce this result</h3><p><code>${escapeHtml(record.reproducibility.command)}</code></p><p>Seed <code>${escapeHtml(record.reproducibility.seed)}</code><br>Fingerprint <code>${escapeHtml(record.verification.fingerprint)}</code></p><a href="/atlas-v2.json" download>Download coordinates ↓</a></section>
    </div>${researchProvenanceChain(record)}${researchReproductionTools(record)}${researchDialogNavigation(record)}
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
  renderResearchTrail();
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
    <div class="research-result-item" role="listitem"><button type="button" data-record="${escapeHtml(record.id)}">
      <span><b>${escapeHtml(researchRecordLabel(record))}</b><small>${escapeHtml(record.experimentId)}</small></span>
      <span>${escapeHtml(record.pattern)}</span>
      <span><i class="${escapeHtml(record.evidence.state)}">${escapeHtml(evidenceStoryLabel(record))}</i></span>
      <span><b>${percent(record.verification.utilization)}</b><small>gap ${percent(record.bounds.optimalityGap)}</small></span>
    </button></div>`).join('') : `<div class="research-empty" role="status"><h3>No verified results match these filters.</h3><p>Change the search terms or clear every filter to return to all ${canonicalRelease.coverage.records} records.</p><button type="button" data-clear-research>Clear filters</button></div>`;
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
  renderResearchTrail();
  renderNextBestActions();
}

function scheduleResearchExplorerRender() {
  if (researchRenderFrame != null) cancelAnimationFrame(researchRenderFrame);
  $('#research-results').setAttribute('aria-busy', 'true');
  researchRenderFrame = requestAnimationFrame(() => {
    researchRenderFrame = null;
    renderResearchExplorer();
  });
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

$('#workshop-baseline').addEventListener('change', event => startWorkshop(event.currentTarget.value, { updateHash: true }));
$('#workshop-placement').addEventListener('change', event => {
  workshopPlacementIndex = Number(event.currentTarget.value);
  renderWorkshopCandidate();
});
function workshopPointForEvent(event) {
  const canvas = $('#workshop-canvas');
  const rect = canvas.getBoundingClientRect();
  return workshopProblemPoint(
    normalizeProblem(workshopCandidate.problem),
    rect.width,
    rect.height,
    event.clientX - rect.left,
    event.clientY - rect.top
  );
}

function updateWorkshopFromCanvas(patch, message) {
  workshopCandidate = updateWorkshopPlacement(workshopCandidate, workshopPlacementIndex, patch);
  markWorkshopDirty(message);
}

$('#workshop-canvas').addEventListener('pointerdown', event => {
  if (!workshopCandidate || event.currentTarget.getAttribute('aria-disabled') === 'true') return;
  const point = workshopPointForEvent(event);
  const index = workshopPlacementAtPoint(normalizeProblem(workshopCandidate.problem), workshopCandidate.solution.placements, point);
  if (index < 0) {
    $('#workshop-editor-status').textContent = 'No triangle was selected. Choose a visible triangle or use the placement list.';
    return;
  }
  workshopPlacementIndex = index;
  const placement = workshopCandidate.solution.placements[index];
  workshopDrag = { pointerId: event.pointerId, offsetX: point.x - placement.x, offsetY: point.y - placement.y };
  event.currentTarget.setPointerCapture(event.pointerId);
  event.currentTarget.focus();
  renderWorkshopCandidate();
  $('#workshop-editor-status').textContent = `Triangle ${index + 1} selected. Drag to move it, or use arrow keys for precise adjustment.`;
});

$('#workshop-canvas').addEventListener('pointermove', event => {
  if (!workshopDrag || workshopDrag.pointerId !== event.pointerId || !workshopCandidate) return;
  const point = workshopPointForEvent(event);
  updateWorkshopFromCanvas(
    { x: point.x - workshopDrag.offsetX, y: point.y - workshopDrag.offsetY },
    `Triangle ${workshopPlacementIndex + 1} moved by direct manipulation. Run local validation before drawing any conclusion.`
  );
});

for (const type of ['pointerup', 'pointercancel']) {
  $('#workshop-canvas').addEventListener(type, event => {
    if (workshopDrag?.pointerId === event.pointerId) workshopDrag = null;
  });
}

$('#workshop-canvas').addEventListener('keydown', event => {
  if (!workshopCandidate || event.currentTarget.getAttribute('aria-disabled') === 'true') return;
  const placement = workshopCandidate.solution.placements[workshopPlacementIndex];
  const patch = workshopKeyboardPatch(placement, event.key, event);
  if (!patch) return;
  event.preventDefault();
  updateWorkshopFromCanvas(patch, `Triangle ${workshopPlacementIndex + 1} adjusted with the keyboard. Run local validation before drawing any conclusion.`);
});
$('#workshop-apply').addEventListener('click', () => {
  try {
    workshopCandidate = updateWorkshopPlacement(workshopCandidate, workshopPlacementIndex, {
      x: Number($('#workshop-x').value),
      y: Number($('#workshop-y').value),
      angle: Number($('#workshop-angle').value),
      reflect: $('#workshop-reflect').checked
    });
    markWorkshopDirty(`Triangle ${workshopPlacementIndex + 1} coordinates were applied locally.`);
  } catch (error) {
    $('#workshop-editor-status').textContent = `${error.message} The candidate was not changed.`;
  }
});
$('.workshop-nudges').addEventListener('click', event => {
  const button = event.target.closest('[data-workshop-nudge]');
  if (!button || !workshopCandidate) return;
  const [axis, amount] = button.dataset.workshopNudge.split(':');
  const placement = workshopCandidate.solution.placements[workshopPlacementIndex];
  try {
    workshopCandidate = updateWorkshopPlacement(workshopCandidate, workshopPlacementIndex, {
      [axis]: placement[axis] + Number(amount)
    });
    markWorkshopDirty(`Triangle ${workshopPlacementIndex + 1} moved ${axis.toUpperCase()} ${Number(amount) > 0 ? '+' : ''}${amount}.`);
  } catch (error) {
    $('#workshop-editor-status').textContent = `${error.message} The candidate was not changed.`;
  }
});
$('#workshop-remove-piece').addEventListener('click', () => {
  try {
    workshopCandidate = removeWorkshopPiece(workshopCandidate, workshopPlacementIndex);
    workshopPlacementIndex = Math.min(workshopPlacementIndex, workshopCandidate.solution.placements.length - 1);
    markWorkshopDirty('The selected triangle was removed from the candidate inventory.');
  } catch (error) {
    $('#workshop-editor-status').textContent = `${error.message} The candidate was not changed.`;
  }
});
$('#workshop-add-piece').addEventListener('click', () => {
  try {
    workshopCandidate = addWorkshopPiece(workshopCandidate);
    workshopPlacementIndex = workshopCandidate.solution.placements.length - 1;
    markWorkshopDirty('A homogeneous triangle was added at the container origin. Move it before validating.');
  } catch (error) {
    $('#workshop-editor-status').textContent = `${error.message} The candidate was not changed.`;
  }
});
for (const selector of ['#workshop-contributor', '#workshop-method', '#workshop-version', '#workshop-seed']) {
  $(selector).addEventListener('input', () => {
    workshopValidation = null;
    renderWorkshopValidation();
    $('#workshop-save-status').textContent = 'Metadata changed. Run local validation again before preparing a contribution.';
  });
}
$('#workshop-validate').addEventListener('click', () => {
  const baseline = selectedWorkshopBaseline();
  if (!baseline || !workshopCandidate || !canonicalRelease) return;
  applyWorkshopMetadata();
  workshopValidation = validateWorkshopCandidate(workshopCandidate, baseline, canonicalRelease.records);
  workshopCandidate = workshopValidation.candidate;
  renderWorkshopValidation();
  $('#workshop-validation-result').focus({ preventScroll: true });
});
$('#workshop-save').addEventListener('click', async () => {
  const status = $('#workshop-save-status');
  try {
    applyWorkshopMetadata();
    const bundle = await createWorkshopBundle({ candidate: workshopCandidate, baseline: selectedWorkshopBaseline(), validation: workshopValidation, release: canonicalRelease, integrity: releaseIntegrity, source: releaseSource });
    localStorage.setItem(workshopStorageKey(), JSON.stringify(bundle));
    status.textContent = `Draft saved in this browser for ${workshopBaselineId}. Its checksum detects accidental changes but is not scientific verification.`;
  } catch {
    status.textContent = 'The draft could not be saved in this browser. Export a bundle instead.';
  }
});
$('#workshop-recover').addEventListener('click', async () => {
  const status = $('#workshop-save-status');
  const raw = localStorage.getItem(workshopStorageKey());
  if (!raw) {
    status.textContent = `No saved browser draft exists for ${workshopBaselineId}.`;
    return;
  }
  const restored = await restoreWorkshopBundle(raw, selectedWorkshopBaseline(), canonicalRelease, releaseIntegrity, releaseSource);
  if (!restored.valid) {
    status.textContent = `${restored.issues[0]} The current candidate was not changed.`;
    return;
  }
  workshopCandidate = restored.candidate;
  workshopValidation = null;
  workshopPlacementIndex = 0;
  renderWorkshopCandidate({ resetMetadata: true });
  status.textContent = `Saved work recovered for ${workshopBaselineId}. Run local validation again before using its conclusions.`;
});
$('#workshop-reset').addEventListener('click', () => {
  startWorkshop(workshopBaselineId);
  $('#workshop-save-status').textContent = 'Candidate reset to the verified baseline. Saved browser work was not deleted.';
});
$('#workshop-file').addEventListener('change', async event => {
  const input = event.currentTarget;
  const status = $('#workshop-save-status');
  const file = input.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    status.textContent = 'That workshop bundle is larger than 5 MB and was not opened.';
    input.value = '';
    return;
  }
  try {
    const restored = await restoreWorkshopBundle(await file.text(), selectedWorkshopBaseline(), canonicalRelease, releaseIntegrity, releaseSource);
    if (!restored.valid) {
      status.textContent = `${restored.issues[0]} The current candidate was not changed.`;
      return;
    }
    workshopCandidate = restored.candidate;
    workshopValidation = null;
    workshopPlacementIndex = 0;
    renderWorkshopCandidate({ resetMetadata: true });
    status.textContent = `Workshop bundle recovered for ${workshopBaselineId}. Local validation must be rerun.`;
  } catch {
    status.textContent = 'The workshop bundle could not be read safely. The current candidate was not changed.';
  } finally {
    input.value = '';
  }
});
$('#workshop-export').addEventListener('click', async () => {
  const status = $('#workshop-save-status');
  try {
    applyWorkshopMetadata();
    const bundle = await createWorkshopBundle({ candidate: workshopCandidate, baseline: selectedWorkshopBaseline(), validation: workshopValidation, release: canonicalRelease, integrity: releaseIntegrity, source: releaseSource });
    const url = URL.createObjectURL(new Blob([`${JSON.stringify(bundle, null, 2)}\n`], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${workshopCandidate.id}-workshop.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    status.textContent = `Reproducible workshop bundle exported for ${workshopBaselineId}. It remains candidate evidence.`;
  } catch {
    status.textContent = 'The workshop bundle could not be exported because verified release identity is unavailable.';
  }
});
$('#workshop-copy-command').addEventListener('click', async () => {
  const status = $('#workshop-save-status');
  try {
    await navigator.clipboard.writeText(`npm run atlas:submission -- ${workshopCandidate.id}.json`);
    status.textContent = 'Full local submission verifier command copied.';
  } catch {
    status.textContent = `Copy was unavailable. Run npm run atlas:submission -- ${workshopCandidate.id}.json after exporting the candidate.`;
  }
});
$('#workshop-github').addEventListener('click', event => {
  if (event.currentTarget.getAttribute('aria-disabled') === 'false') return;
  event.preventDefault();
  $('#workshop-save-status').textContent = 'GitHub handoff stays locked until local geometry, metadata, and incumbent comparison support an improvement candidate.';
});

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
function currentPortableSession() {
  return {
    map: currentMapState(),
    research: currentResearchState(),
    comparison: currentComparisonState(),
    shortlist: comparisonWorkspaceIds
  };
}

$('#session-download').addEventListener('click', async () => {
  const status = $('#session-status');
  try {
    const bundle = await createResearchSession(currentPortableSession(), canonicalRelease, releaseIntegrity, canonicalRelease.records.map(record => record.id));
    const url = URL.createObjectURL(new Blob([`${JSON.stringify(bundle, null, 2)}\n`], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `triangle-packing-atlas-session-${canonicalRelease.version}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    status.textContent = 'Research session downloaded with this verified release identity.';
  } catch {
    status.textContent = 'The session was not downloaded because verified release identity is unavailable.';
  }
});

$('#session-file').addEventListener('change', async event => {
  const input = event.currentTarget;
  const status = $('#session-status');
  const file = input.files[0];
  if (!file) return;
  if (file.size > 64 * 1024) {
    status.textContent = 'That session is larger than 64 KB and was not opened.';
    input.value = '';
    return;
  }
  try {
    const result = await restoreResearchSession(await file.text(), canonicalRelease, releaseIntegrity, canonicalRelease.records.map(record => record.id));
    if (!result.valid) {
      status.textContent = `${result.issues[0]} No research context was changed.`;
      return;
    }
    applyMapState(result.session.map);
    applyResearchState(result.session.research);
    renderResearchExplorer();
    applyComparisonState(result.session.comparison);
    comparisonWorkspaceIds = result.session.shortlist;
    persistComparisonWorkspace('The imported shortlist was checked against this verified release.');
    status.textContent = result.releaseChanged
      ? `Session restored against the current release. ${result.removed} unavailable saved reference${result.removed === 1 ? ' was' : 's were'} removed.`
      : result.removed
        ? `Session restored partially. ${result.removed} unavailable saved reference${result.removed === 1 ? ' was' : 's were'} removed.`
        : 'Research session restored and checked against this verified release.';
    status.focus({ preventScroll: true });
  } catch {
    status.textContent = 'The session could not be read safely. No research context was changed.';
  } finally {
    input.value = '';
  }
});
$('#research-trail-reset').addEventListener('click', () => {
  if (!canonicalRelease) return;
  applyMapState({ angle: 60, ratio: 1.5, record: null, view: 'overview' });
  applyResearchState({ query: '', family: 'all', evidence: 'all', record: null });
  applyComparisonState(comparisonDefaults());
  history.pushState(null, '', '#map');
  renderResearchExplorer();
  renderResearchTrail();
  $('#advanced-orientation-title').focus?.({ preventScroll: true });
  $('#research-trail-action-status').textContent = 'A new research trail started from the default verified map view.';
});
$('#research-trail-copy').addEventListener('click', async () => {
  const status = $('#research-trail-action-status');
  const summary = researchTrailReportSummary(currentResearchTrailReport());
  if (!summary) {
    status.textContent = 'A verified release identity is unavailable, so no evidence summary was copied.';
    return;
  }
  try {
    await navigator.clipboard.writeText(summary);
    status.textContent = 'Research summary copied with verified release identity and evidence scope.';
  } catch {
    status.textContent = 'Copy was unavailable. Download the integrity-linked trail report instead.';
  }
});
$('#research-trail-download').addEventListener('click', () => {
  const status = $('#research-trail-action-status');
  const report = currentResearchTrailReport();
  if (!report) {
    status.textContent = 'A verified release identity is unavailable, so no trail report was downloaded.';
    return;
  }
  const url = URL.createObjectURL(new Blob([`${JSON.stringify(report, null, 2)}\n`], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `triangle-packing-research-trail-${report.release.version}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  status.textContent = 'Research trail downloaded with exact release, record, and reproduction identity.';
});
$('#research-command-form').addEventListener('submit', event => {
  event.preventDefault();
  const status = $('#research-command-status');
  const command = parseResearchCommand($('#research-command').value);
  status.textContent = command.message;
  if (!command.valid || !canonicalRelease || releasePhase !== 'ready') return;
  if (command.comparison) {
    const matches = canonicalRelease.records.filter(record =>
      (command.family === 'all' || record.family === command.family)
      && (command.evidence === 'all' || record.evidence.state === command.evidence));
    if (matches.length < 2) {
      status.textContent = `${command.message} Fewer than two verified records match, so no comparison was opened.`;
      return;
    }
    applyComparisonState({ left: matches[0].id, right: matches[1].id });
    history.pushState(null, '', formatComparisonHash({ left: matches[0].id, right: matches[1].id }));
    renderResearchTrail();
    return;
  }
  if (command.evidence !== 'all' || command.family !== 'all') {
    const query = [command.angle, command.ratio].filter(value => value != null).join(' ');
    const state = { query, family: command.family, evidence: command.evidence, record: null };
    applyResearchState(state);
    history.pushState(null, '', formatResearchHash(state));
    renderResearchExplorer();
    return;
  }
  if (command.angle != null) $('#angle').value = command.angle;
  if (command.ratio != null) $('#ratio').value = command.ratio;
  updatePhase({ historyMode: 'push' });
});
for (const selector of ['#research-search', '#research-family', '#research-evidence']) {
  $(selector).addEventListener(selector === '#research-search' ? 'input' : 'change', () => {
    researchLimit = 24;
    const hash = formatResearchHash(currentResearchState());
    if (selector === '#research-search') history.replaceState(null, '', hash);
    else history.pushState(null, '', hash);
    if (selector === '#research-search') scheduleResearchExplorerRender();
    else renderResearchExplorer();
  });
}
$('#research-clear').addEventListener('click', () => clearResearchFilters());
$('#research-results').addEventListener('click', event => {
  if (event.target.closest('[data-retry-release]')) startReleaseRecovery({ manual: true });
});
$('#research-load-status').addEventListener('click', event => {
  if (event.target.closest('[data-retry-release]')) startReleaseRecovery({ manual: true });
});
$('#map-data-status').addEventListener('click', event => {
  if (event.target.closest('[data-retry-release]')) startReleaseRecovery({ manual: true, target: '#map-data-status' });
});
$('#offline-readiness-check').addEventListener('click', async () => {
  await renderOfflineReadiness();
  $('#offline-readiness-status').focus({ preventScroll: true });
});
$('#browser-diagnostics-run').addEventListener('click', () => renderProductionDiagnostics({ focus: true }));
window.addEventListener('offline', showOfflineExperience);
window.addEventListener('offline', () => renderOfflineReadiness());
window.addEventListener('online', () => {
  offlineFallbackActive = false;
  renderOfflineReadiness('Back online. Checking whether a newer verified release is available…');
  startReleaseRecovery({ reason: 'reconnected' });
});
document.addEventListener('visibilitychange', refreshLongSessionStatus);
window.addEventListener('pagehide', () => {
  clearTimeout(releaseFreshnessTimer);
  researchLoadController?.abort();
});
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
function currentVerifiedComparisonReport() {
  const left = canonicalRelease?.records.find(record => record.id === $('#compare-a').value);
  const right = canonicalRelease?.records.find(record => record.id === $('#compare-b').value);
  return createComparisonReport(left, right, canonicalRelease, releaseIntegrity, releaseSource);
}

$('#comparison-copy-report').addEventListener('click', async () => {
  const status = $('#comparison-share-status');
  try {
    await navigator.clipboard.writeText(comparisonReportSummary(currentVerifiedComparisonReport()));
    status.textContent = 'Evidence-aware comparison summary copied.';
  } catch {
    status.textContent = 'The verified comparison summary could not be copied. Check the release and try again.';
  }
});
$('#comparison-download').addEventListener('click', () => {
  const status = $('#comparison-share-status');
  try {
    const report = currentVerifiedComparisonReport();
    const url = URL.createObjectURL(new Blob([`${JSON.stringify(report, null, 2)}\n`], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report.records.a.id}-vs-${report.records.b.id}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    status.textContent = 'Integrity-linked comparison report downloaded.';
  } catch {
    status.textContent = 'The report was not downloaded because verified comparison evidence is unavailable.';
  }
});
$('#comparison-save-a').addEventListener('click', () => saveComparisonRecord('a'));
$('#comparison-save-b').addEventListener('click', () => saveComparisonRecord('b'));
$('#comparison-workspace-list').addEventListener('click', event => {
  const item = event.target.closest('[data-workspace-record]');
  if (!item || !canonicalRelease) return;
  const use = event.target.closest('[data-workspace-use]');
  if (use) {
    const side = use.dataset.workspaceUse;
    const select = $(`#compare-${side}`);
    select.dataset.selectedId = item.dataset.workspaceRecord;
    renderComparisonCandidates(side);
    updateComparison();
    $('#comparison-summary').focus({ preventScroll: true });
    return;
  }
  const action = event.target.closest('[data-workspace-action]');
  if (!action) return;
  comparisonWorkspaceIds = updateComparisonWorkspace(comparisonWorkspaceIds, action.dataset.workspaceAction, item.dataset.workspaceRecord);
  persistComparisonWorkspace(action.dataset.workspaceAction === 'remove'
    ? `${item.dataset.workspaceRecord} was removed from the shortlist.`
    : `${item.dataset.workspaceRecord} was moved ${action.dataset.workspaceAction === 'up' ? 'earlier' : 'later'}.`);
  [...$('#comparison-workspace-list').querySelectorAll('[data-workspace-record]')]
    .find(entry => entry.dataset.workspaceRecord === item.dataset.workspaceRecord)
    ?.querySelector(`[data-workspace-action="${action.dataset.workspaceAction}"]`)?.focus();
});
$('#contribution-file').addEventListener('change', async event => {
  const input = event.currentTarget;
  const status = $('#contribution-preflight-status');
  const file = input.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) {
    status.textContent = 'That file is larger than 10 MB and was not opened. Reduce it to one proposed record.';
    input.value = '';
    return;
  }
  try {
    const candidate = JSON.parse(await file.text());
    const baseline = canonicalRelease?.records.find(record => record.id === $('#contribution-baseline').value);
    const report = preflightContribution(candidate, baseline);
    renderContributionPreflight(report);
    status.textContent = report.readyForFullVerification
      ? 'Browser preflight passed. Run the full local geometry and incumbent checks next.'
      : 'Browser preflight found issues. Review each failed item before running full verification.';
  } catch {
    $('#contribution-preflight-results').replaceChildren();
    status.textContent = 'The selected file is not readable JSON. No submission data was retained.';
  } finally {
    input.value = '';
  }
});
$('#contribution-baseline').addEventListener('change', renderContributionHandoff);
$('#contribution-starter-download').addEventListener('click', () => {
  const status = $('#contribution-starter-status');
  try {
    const baseline = selectedContributionBaseline();
    const starter = createContributionStarter(baseline, canonicalRelease, releaseIntegrity, releaseSource);
    const handoff = contributionHandoff(baseline);
    const url = URL.createObjectURL(new Blob([`${JSON.stringify(starter, null, 2)}\n`], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = handoff.filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    status.textContent = `Starter downloaded for ${baseline.id}. Replace the duplicate coordinates and placeholder attribution before verification.`;
  } catch {
    status.textContent = 'A verified baseline is unavailable, so no starter was downloaded.';
  }
});
$('#contribution-command-copy').addEventListener('click', async () => {
  const status = $('#contribution-starter-status');
  try {
    const handoff = contributionHandoff(selectedContributionBaseline());
    await navigator.clipboard.writeText(handoff.verifyCommand);
    status.textContent = `Full verifier command copied for ${handoff.filename}.`;
  } catch {
    status.textContent = 'Copy was unavailable. Run npm run atlas:submission with the downloaded starter path.';
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
  const copyCommand = event.target.closest('[data-copy-evidence-command]');
  if (copyCommand && canonicalRelease) {
    const record = canonicalRelease.records.find(item => item.id === copyCommand.dataset.copyEvidenceCommand);
    const status = $('#record-dialog [data-evidence-status]');
    if (!record || !releaseIntegrity) {
      status.textContent = 'Verified evidence is unavailable. Check the release again before copying.';
      return;
    }
    navigator.clipboard.writeText(record.reproducibility.command)
      .then(() => { status.textContent = 'Reproduction command copied.'; })
      .catch(() => { status.textContent = 'Copy was unavailable. Select the command shown above and copy it manually.'; });
    return;
  }
  const downloadEvidence = event.target.closest('[data-download-evidence]');
  if (downloadEvidence && canonicalRelease) {
    const record = canonicalRelease.records.find(item => item.id === downloadEvidence.dataset.downloadEvidence);
    const status = $('#record-dialog [data-evidence-status]');
    try {
      const bundle = createEvidenceBundle(record, canonicalRelease, releaseIntegrity, releaseSource);
      const url = URL.createObjectURL(new Blob([`${JSON.stringify(bundle, null, 2)}\n`], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${record.id}-evidence.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      status.textContent = `Evidence package downloaded for ${record.id}.`;
    } catch {
      status.textContent = 'Verified evidence is unavailable. Check the release again before downloading.';
    }
    return;
  }
  const navigation = event.target.closest('[data-dialog-record]');
  if (navigation?.dataset.dialogRecord && canonicalRelease) {
    const record = canonicalRelease.records.find(item => item.id === navigation.dataset.dialogRecord);
    if (record) openResearchRecord(record, { preserveContext: true });
    return;
  }
  if (event.target === $('#record-dialog')) closeRecordDialog();
});
$('#record-dialog').addEventListener('change', async event => {
  const input = event.target.closest('[data-validate-evidence]');
  if (!input) return;
  const status = $('#record-dialog [data-evidence-status]');
  const trustedRecord = canonicalRelease?.records.find(item => item.id === input.dataset.validateEvidence);
  try {
    const bundle = JSON.parse(await input.files[0].text());
    const result = validateEvidenceBundle(bundle, trustedRecord, canonicalRelease, releaseIntegrity, releaseSource);
    status.textContent = result.valid
      ? `Evidence package validated for ${trustedRecord.id}. The identity, certificate, reproduction details, and release digest all match.`
      : `Evidence package not accepted: ${result.issues.join(' ')}`;
  } catch {
    status.textContent = 'Evidence package not accepted: the selected file is not readable JSON.';
  } finally {
    input.value = '';
  }
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
listenForMediaChange(matchMedia('(min-width: 721px)'), event => {
  if (event.matches) closePrimaryNavigation();
});
window.addEventListener('resize', updatePhase);
setupCurrentTaskTracking();
renderBrowserCompatibility();

makePhaseMap();
if (location.hash.startsWith('#map')) applyMapState(parseMapHash(location.hash));
else updatePhase();
renderFilters();
renderRecords();
renderChallenges();
if (compatibility.canVerifyRelease) setupOfflineMode().finally(() => loadResearchRelease());
else {
  releasePhase = 'failed';
  renderResearchReleaseStatus(renderReleaseExperience('failed'), compatibility.message);
  $('#research-results').setAttribute('aria-busy', 'false');
  $('#research-results').innerHTML = '<div class="load-error" role="alert"><h3>Verified data cannot be checked in this browser.</h3><p>Update the browser to restore integrity-checked research results.</p></div>';
  setComparisonUnavailable('Verified comparison records cannot be checked in this browser.');
}
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
