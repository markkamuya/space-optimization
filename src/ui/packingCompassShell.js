export const COMPASS_GOALS = Object.freeze({
  find: {
    label: 'Find the best packing',
    title: 'Describe the packing you need.',
    guidance: 'Choose a triangle and rectangle. The Atlas will return one integrity-checked result and explain what is known about it.',
    destination: '#map'
  },
  verify: {
    label: 'Check whether a claim is proven',
    title: 'Start from a verified Atlas result.',
    guidance: 'Search by shape or record identity, then inspect the evidence, bounds, coordinates, and reproduction trail.',
    destination: '#research'
  },
  compare: {
    label: 'Compare two results',
    title: 'Put two verified packings side by side.',
    guidance: 'Compare rectangle fill, unused space, evidence level, and room for improvement without treating unlike problems as equivalent.',
    destination: '#compare'
  },
  improve: {
    label: 'Improve an open result',
    title: 'Begin with a reproducible challenge.',
    guidance: 'Choose an open result, reproduce its verified baseline, and prepare a candidate without changing the published claim.',
    destination: '#workshop'
  }
});

export function parseCompassHash(hash = '') {
  if (!hash.startsWith('#compass')) return { goal: null };
  const query = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '';
  const goal = new URLSearchParams(query).get('goal');
  return { goal: Object.hasOwn(COMPASS_GOALS, goal) ? goal : null };
}

export function formatCompassHash(goal = null) {
  return goal && Object.hasOwn(COMPASS_GOALS, goal)
    ? `#compass?goal=${encodeURIComponent(goal)}`
    : '#compass';
}

export function atlasModeForHash(hash = '') {
  return !hash || hash === '#top' || hash.startsWith('#compass') ? 'guided' : 'advanced';
}

export function setupPackingCompassShell({ document, location, history }) {
  const body = document.body;
  const modeToggle = document.querySelector('#atlas-mode-toggle');
  const workspace = document.querySelector('#compass-workspace');
  const title = document.querySelector('#compass-workspace-title');
  const guidance = document.querySelector('#compass-workspace-guidance');
  const advancedLink = document.querySelector('#compass-advanced-link');
  const goalButtons = [...document.querySelectorAll('[data-compass-goal]')];

  function setMode(mode) {
    const guided = mode === 'guided';
    body.classList.toggle('guided-mode', guided);
    body.classList.toggle('advanced-mode', !guided);
    modeToggle.setAttribute('aria-pressed', String(!guided));
    modeToggle.textContent = guided ? 'Open advanced Atlas' : 'Return to Packing Compass';
  }

  function renderGoal(goal, { focus = false } = {}) {
    const selected = COMPASS_GOALS[goal] ?? null;
    goalButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.compassGoal === goal)));
    workspace.hidden = !selected;
    if (!selected) return;
    title.textContent = selected.title;
    guidance.textContent = selected.guidance;
    advancedLink.href = selected.destination;
    advancedLink.textContent = `Open ${selected.label.toLowerCase()} tools`;
    if (focus) {
      workspace.scrollIntoView({ block: 'start' });
      title.focus({ preventScroll: true });
    }
  }

  function syncFromLocation() {
    const mode = atlasModeForHash(location.hash);
    setMode(mode);
    if (mode === 'guided') {
      const { goal } = parseCompassHash(location.hash);
      renderGoal(goal);
      window.dispatchEvent(new CustomEvent('packing-compass:goal', { detail: { goal } }));
    }
    window.dispatchEvent(new CustomEvent('atlas:location', { detail: { mode, hash: location.hash } }));
  }

  goalButtons.forEach(button => button.addEventListener('click', () => {
    const goal = button.dataset.compassGoal;
    history.pushState(null, '', formatCompassHash(goal));
    setMode('guided');
    renderGoal(goal, { focus: true });
    window.dispatchEvent(new CustomEvent('packing-compass:goal', { detail: { goal } }));
  }));

  modeToggle.addEventListener('click', () => {
    const guided = body.classList.contains('guided-mode');
    history.pushState(null, '', guided ? '#map' : formatCompassHash(parseCompassHash(location.hash).goal));
    syncFromLocation();
    (guided ? document.querySelector('#map h2') : document.querySelector('#compass-title'))?.focus({ preventScroll: true });
  });

  window.addEventListener('hashchange', syncFromLocation);
  syncFromLocation();
  return { renderGoal, setMode, syncFromLocation };
}
