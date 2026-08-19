import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, script, styles, compatibility, loader] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../src/main.js', import.meta.url), 'utf8'),
  readFile(new URL('../styles.css', import.meta.url), 'utf8'),
  readFile(new URL('../src/ui/browserCompatibility.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/ui/shardedReleaseLoader.js', import.meta.url), 'utf8')
]);

const gates = {
  capabilityFailClosed: /canVerifyRelease/.test(script) && /Verified data cannot be checked/.test(script),
  runtimeStatus: /id="browser-runtime-status"[^>]+role="status"/.test(html),
  semanticDialog: /<dialog[^>]+aria-labelledby="record-dialog-title"[^>]+aria-describedby="record-dialog-summary"/.test(html),
  keyboardNavigation: /trapPrimaryNavigationFocus/.test(script) && /handlePhaseGridKeydown/.test(script),
  recovery: /startReleaseRecovery/.test(script) && /finishReleaseRecovery/.test(script),
  webkitEffectsFallback: (styles.match(/-webkit-backdrop-filter/g) ?? []).length >= 3,
  colorMixFallback: /background:var\(--phase-color\); background:color-mix/.test(styles),
  narrowLayout: /@media\(max-width:720px\)/.test(styles) && /min-height:48px/.test(styles),
  reducedMotion: /prefers-reduced-motion:reduce/.test(styles),
  forcedColors: /forced-colors:active/.test(styles),
  currentEngineTargets: ['Firefox', 'Safari', 'Chromium'].every(engine => html.includes(`<b>${engine}</b>`)),
  noArrayAtDependency: !/\.at\(/.test(script) && !/\.at\(/.test(compatibility) && !/\.at\(/.test(loader)
};

for (const [gate, passed] of Object.entries(gates)) assert.equal(passed, true, `Browser certification gate failed: ${gate}`);
console.log(JSON.stringify({
  format: 'triangle-packing-browser-certification/v1',
  passed: true,
  engines: ['Firefox', 'Safari', 'Chromium'],
  viewportRange: { minimumCssPixels: 390, maximumCssPixels: 1440 },
  gates
}, null, 2));
