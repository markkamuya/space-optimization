import { readFile, writeFile } from 'node:fs/promises';

const queue = JSON.parse(await readFile(new URL('../public/work-queue-v2.json', import.meta.url), 'utf8'));
const selected = queue.tasks
  .filter(task => task.priority === 'high')
  .slice(0, 12)
  .map((task, index) => ({
    challengeId: `TPA-C${String(index + 1).padStart(2, '0')}`,
    title: `Improve ${task.recordId}`,
    recordId: task.recordId,
    experimentId: task.experimentId,
    baseline: {
      utilization: task.baselineUtilization,
      upperBound: task.upperBound,
      fingerprint: task.baselineFingerprint
    },
    objective: task.objective,
    budget: task.budget,
    requiredEvidence: [
      'complete triangle coordinates',
      'deterministic seed and solver version',
      'strictly improved verified utilization or stronger rigorous bound',
      'contributor attribution and license agreement'
    ],
    starterCommand: `npm run atlas:experiment -- --record ${task.recordId}`,
    submissionGuide: 'docs/SUBMISSION_WALKTHROUGH.md',
    status: 'open'
  }));

const release = {
  format: 'triangle-packing-community-challenges/v1',
  version: '2.0.0',
  publishedAt: '2026-07-26T00:00:00.000Z',
  externalContributionsAccepted: 0,
  challenges: selected,
  note: 'Challenges are public and machine-verifiable. No external contribution is claimed until a non-maintainer pull request is accepted.'
};
await writeFile(new URL('../public/community-challenges-v2.json', import.meta.url), `${JSON.stringify(release, null, 2)}\n`);
console.log(`Published ${selected.length} community challenges.`);
