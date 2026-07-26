#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { normalizeProblem } from '../src/core/problem.js';
import { transform, vertices } from '../src/geometry/triangle.js';
import { assessSubmission } from '../src/atlas/submission.js';
import { ATLAS_RECORDS } from '../src/atlas/catalog.js';
import { RESEARCH_RECORDS } from '../src/research/dataset.js';

const input = process.argv[2];
const output = process.argv[3] ?? 'submission-report.svg';
if (!input) {
  console.error('Usage: npm run atlas:report -- record.json [report.svg]');
  process.exit(2);
}
const record = JSON.parse(await readFile(input, 'utf8'));
const report = assessSubmission(record, [...ATLAS_RECORDS, ...RESEARCH_RECORDS]);
const problem = normalizeProblem(record.problem);
const width = 960;
const height = 620;
const plot = { x: 50, y: 140, width: 620, height: 420 };
const scale = Math.min(plot.width / problem.width, plot.height / problem.height);
const colors = ['#ff6b35', '#3dd6b0', '#5f8cff', '#bd8bff', '#f5c451'];
const shapes = problem.triangles.map((triangle, index) => {
  const points = vertices(transform(triangle.shape, record.solution.placements[index]))
    .map(point => `${plot.x + point.x * scale},${plot.y + point.y * scale}`)
    .join(' ');
  return `<polygon points="${points}" fill="${colors[index % colors.length]}" fill-opacity=".76" stroke="#14201c" stroke-width="1"/>`;
}).join('');
const status = report.disposition.replaceAll('_', ' ').toUpperCase();
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="100%" height="100%" fill="#f3f0e7"/><text x="50" y="50" font-family="monospace" font-size="13" letter-spacing="2">TRIANGLE PACKING ATLAS · AUTOMATED SUBMISSION REPORT</text>
<text x="50" y="95" font-family="sans-serif" font-size="32" font-weight="700">${record.id}</text>
<rect x="${plot.x}" y="${plot.y}" width="${problem.width * scale}" height="${problem.height * scale}" fill="#fffdf7" stroke="#14201c" stroke-width="2"/>${shapes}
<text x="710" y="180" font-family="monospace" font-size="11">DISPOSITION</text><text x="710" y="210" font-family="sans-serif" font-size="18" font-weight="700">${status}</text>
<text x="710" y="270" font-family="monospace" font-size="11">GEOMETRY</text><text x="710" y="295" font-family="sans-serif" font-size="16">${report.verification.valid ? 'VALID' : 'INVALID'}</text>
<text x="710" y="350" font-family="monospace" font-size="11">UTILIZATION</text><text x="710" y="380" font-family="sans-serif" font-size="28" font-weight="700">${((report.comparison.candidateUtilization ?? 0) * 100).toFixed(2)}%</text>
<text x="710" y="440" font-family="monospace" font-size="11">BEST KNOWN</text><text x="710" y="465" font-family="sans-serif" font-size="14">${report.comparison.bestKnownId ?? 'NEW PROBLEM'}</text>
<text x="50" y="590" font-family="monospace" font-size="10">Automated checks do not validate mathematical proofs or citation claims. Maintainer review required.</text></svg>`;
await writeFile(output, svg);
console.log(`Wrote ${output}`);
