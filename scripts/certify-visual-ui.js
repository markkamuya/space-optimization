import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const [html, styles, expected] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../styles.css', import.meta.url), 'utf8'),
  readFile(new URL('../test/fixtures/ui-visual-contract.json', import.meta.url), 'utf8').then(JSON.parse).catch(() => null)
]);

const lines = value => value.split('\n').map(line => line.trim()).filter(Boolean);
const select = (value, tokens) => lines(value).filter(line => tokens.some(token => line.includes(token))).join('\n');
const digest = value => createHash('sha256').update(value).digest('hex');
const actual = {
  format: 'triangle-packing-atlas-visual-contract/v1',
  desktop: digest(select(styles, ['.topbar {', '.workspace-rail {', '.research-toolbar {', '.registry-results button {', 'dialog {', '.browser-diagnostics {'])),
  responsive: digest(select(styles, ['@media(max-width:720px)', '@media(max-width:520px)', '@media(max-width:480px)'])),
  preferences: digest(select(styles, ['prefers-reduced-motion:reduce', 'prefers-contrast:more', 'forced-colors:active'])),
  landmarks: digest(select(html, ['id="map"', 'id="research"', 'id="compare"', 'id="contribute"', 'id="record-dialog"', 'id="browser-diagnostics-status"']))
};
const gates = Object.fromEntries(Object.keys(actual).filter(key => key !== 'format').map(key => [key, expected?.[key] === actual[key]]));
const passed = expected?.format === actual.format && Object.values(gates).every(Boolean);
process.stdout.write(`${JSON.stringify({ format: actual.format, passed, gates, actual }, null, 2)}\n`);
if (!passed) process.exitCode = 1;
