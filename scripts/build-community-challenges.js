import { readFile, writeFile } from 'node:fs/promises';
import { buildCommunityChallenges } from '../src/research/challenges.js';

const queue = JSON.parse(await readFile(new URL('../public/work-queue-v2.json', import.meta.url), 'utf8'));
const selected = buildCommunityChallenges(queue.tasks);

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
