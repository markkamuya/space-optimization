import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { atlasModeForHash, formatCompassHash, parseCompassHash, focusCompassDestination, setupPackingCompassShell } from '../../src/ui/packingCompassShell.js';

test('return preserves the active goal while history remains authoritative and passive', () => {
  const elements = new Map();
  const makeElement = () => ({
    events: {}, dataset: {}, focusCount: 0,
    setAttribute() {}, scrollIntoView() {},
    focus() { this.focusCount++; },
    addEventListener(name, fn) { this.events[name] = fn; }
  });
  const classes = new Set();
  const buttons = ['find', 'verify', 'compare', 'improve'].map(goal => {
    const button = makeElement();
    button.dataset.compassGoal = goal;
    return button;
  });
  const document = {
    body: { classList: {
      toggle(name, enabled) { enabled ? classes.add(name) : classes.delete(name); },
      contains: name => classes.has(name)
    } },
    querySelector(selector) {
      if (!elements.has(selector)) elements.set(selector, makeElement());
      return elements.get(selector);
    },
    querySelectorAll: () => buttons
  };
  const events = {};
  const location = { hash: '#compass?goal=improve' };
  const history = { pushState(_state, _title, hash) { location.hash = hash; } };
  setupPackingCompassShell({ document, location, history, window: {
    addEventListener(name, fn) { events[name] = fn; }, dispatchEvent() {}
  } });
  const toggle = elements.get('#atlas-mode-toggle');
  toggle.events.click();
  assert.equal(location.hash, '#map');
  toggle.events.click();
  assert.equal(location.hash, '#compass?goal=improve');
  assert.equal(elements.get('#compass-workspace').hidden, false);
  const focusedBeforeHistory = [...elements.values()].reduce((sum, el) => sum + el.focusCount, 0);
  location.hash = '#compass?goal=compare';
  events.hashchange();
  location.hash = '#research?record=iso-a60-r1p5';
  events.hashchange();
  assert.equal([...elements.values()].reduce((sum, el) => sum + el.focusCount, 0), focusedBeforeHistory);
  toggle.events.click();
  assert.equal(location.hash, '#compass?goal=compare');
  location.hash = '#compass?goal=unknown';
  events.hashchange();
  toggle.events.click();
  toggle.events.click();
  assert.equal(location.hash, '#compass');
});

test('mode switch makes its destination focusable and visible before moving focus', () => {
  const calls = [];
  focusCompassDestination({
    setAttribute: (...args) => calls.push(['attribute', ...args]),
    scrollIntoView: options => calls.push(['scroll', options]),
    focus: options => calls.push(['focus', options])
  });
  assert.deepEqual(calls, [
    ['attribute', 'tabindex', '-1'],
    ['scroll', { block: 'start', behavior: 'instant' }],
    ['focus', { preventScroll: true }]
  ]);
  assert.doesNotThrow(() => focusCompassDestination(null));
});

test('guided mode is the default while legacy research links retain advanced mode', () => {
  assert.equal(atlasModeForHash(''), 'guided');
  assert.equal(atlasModeForHash('#compass?goal=find'), 'guided');
  for (const hash of ['#map', '#research?record=iso-a60-r1p5', '#compare', '#challenges']) {
    assert.equal(atlasModeForHash(hash), 'advanced');
  }
});

test('packing compass goal links are bounded and backward safe', () => {
  assert.equal(formatCompassHash('verify'), '#compass?goal=verify');
  assert.deepEqual(parseCompassHash('#compass?goal=compare'), { goal: 'compare' });
  assert.deepEqual(parseCompassHash('#compass?goal=unknown'), { goal: null });
  assert.deepEqual(parseCompassHash('#research?q=right'), { goal: null });
});

test('production page exposes one task-first guided shell and an advanced escape hatch', async () => {
  const [html, styles, shell, main] = await Promise.all([
    readFile(new URL('../../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../../styles.css', import.meta.url), 'utf8'),
    readFile(new URL('../../src/ui/packingCompassShell.js', import.meta.url), 'utf8'),
    readFile(new URL('../../src/main.js', import.meta.url), 'utf8')
  ]);
  assert.match(html, /<section id="compass" class="packing-compass" aria-labelledby="compass-title">/);
  assert.match(html, /What are you trying to discover\?/);
  assert.equal((html.match(/data-compass-goal=/g) ?? []).length, 4);
  assert.match(html, /id="atlas-mode-toggle"[^>]+aria-pressed="false"/);
  assert.match(styles, /\.guided-mode main>:not\(#top\):not\(#browser-compatibility\):not\(#compass\)/);
  assert.match(styles, /\.guided-mode \.topbar nav,\.guided-mode \.contribute-link,\.guided-mode \.nav-toggle/);
  assert.match(styles, /@media\(max-width:720px\).*\.compass-goals\{grid-template-columns:1fr/s);
  assert.match(styles, /\.compass-workspace>\.secondary-action\[hidden\] \{ display:none; \}/);
  assert.match(shell, /advancedLink\.hidden = goal === 'improve'/);
  assert.match(main, /Start with this baseline in Packing Workshop/);
  assert.match(main, /formatWorkshopHash\(record\.id, \{ source: 'compass' \}\)/);
  assert.match(main, /if \(question\.goal === 'improve'\) continuation\.hidden = true/);
});
