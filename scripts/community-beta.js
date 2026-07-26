import { readFile, writeFile } from 'node:fs/promises';
import { ATLAS_RECORDS } from '../src/atlas/catalog.js';
import { assessSubmission } from '../src/atlas/submission.js';

const template = JSON.parse(await readFile(new URL('../atlas/submissions/template.json', import.meta.url), 'utf8'));
const duplicateSource = ATLAS_RECORDS[0];
const duplicate = {
  format: 'triangle-packing-atlas/v1',
  id: 'beta-duplicate',
  problem: duplicateSource.problem,
  solution: duplicateSource.solution,
  evidence: { status: 'candidate' },
  provenance: { generator: 'beta', contributor: 'Simulated contributor', createdAt: '2026-07-26T00:00:00.000Z' }
};
const invalid = structuredClone(template);
invalid.id = 'beta-invalid-overlap';
invalid.solution.placements[1] = { ...invalid.solution.placements[0] };
const proof = structuredClone(template);
proof.id = 'beta-proof-review';
proof.evidence = { status: 'proven_optimal', proof: { type: 'candidate proof' } };

const scenarios = [
  { id: 'new-problem', candidate: template, expected: 'new_problem' },
  { id: 'duplicate', candidate: duplicate, expected: 'reject_duplicate' },
  { id: 'invalid-overlap', candidate: invalid, expected: 'reject_invalid' },
  { id: 'proof-human-review', candidate: proof, expected: 'new_problem', review: true }
];

const results = scenarios.map(scenario => {
  const report = assessSubmission(scenario.candidate, ATLAS_RECORDS);
  return {
    id: scenario.id,
    disposition: report.disposition,
    expected: scenario.expected,
    passed: report.disposition === scenario.expected &&
      (!scenario.review || report.humanReviewRequired),
    failureStage: !report.schema.valid ? 'schema' :
      !report.verification.valid ? 'geometry' :
      report.comparison.duplicateOf ? 'comparison' :
      report.humanReviewRequired ? 'human_review' : null
  };
});
const beta = {
  format: 'triangle-packing-community-beta/v1',
  type: 'simulated_acceptance_test',
  externalContributors: 0,
  externalGateSatisfied: false,
  scenarios: results,
  passed: results.every(result => result.passed),
  note: 'Automation is validated; real external participation remains a v1 release gate.'
};
await writeFile(new URL('../public/community-beta.json', import.meta.url), `${JSON.stringify(beta, null, 2)}\n`);
console.log(JSON.stringify(beta, null, 2));
if (!beta.passed) process.exitCode = 1;
