import { readFile } from 'node:fs/promises';

const [html, styles, script] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../styles.css', import.meta.url), 'utf8'),
  readFile(new URL('../src/main.js', import.meta.url), 'utf8')
]);

const fixedTextSelectors = [...styles.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter(([, selector, declarations]) =>
    /(^|[,\s>+~])(?:p|h[1-6]|button|label)(?=[:.#\s>,+~]|$)/.test(selector)
    && /(^|;)\s*height\s*:/.test(declarations)
  );

const gates = {
  namedWorkflows: ['research-title', 'compare-title', 'contribute-title'].every(id => html.includes(`aria-labelledby="${id}"`)),
  focusedAnnouncements: /id="research-result-count"[^>]+role="status"[^>]+aria-live="polite"/.test(html)
    && !/id="research-results"[^>]+aria-live/.test(html),
  canvasAlternative: /id="record-visual-summary" class="sr-only"/.test(script)
    && /aria-describedby="record-visual-summary"/.test(script),
  keyboardFocus: /:focus-visible/.test(styles) && /outline:3px solid/.test(styles),
  zoomLayout: /@media\(max-width:480px\)/.test(styles)
    && /body\{min-width:0\}/.test(styles)
    && /dialog\{width:100vw;max-width:100vw;max-height:100dvh\}/.test(styles),
  adaptivePreferences: /prefers-reduced-motion:reduce/.test(styles)
    && /prefers-contrast:more/.test(styles)
    && /forced-colors:active/.test(styles),
  flexibleText: fixedTextSelectors.length === 0
};

const failed = Object.entries(gates).filter(([, passed]) => !passed).map(([name]) => name);
process.stdout.write(`${JSON.stringify({ schema: 'triangle-packing-atlas-accessibility-certification/v1', gates, passed: failed.length === 0 }, null, 2)}\n`);
if (failed.length) {
  process.stderr.write(`Accessibility certification failed: ${failed.join(', ')}\n`);
  process.exitCode = 1;
}
