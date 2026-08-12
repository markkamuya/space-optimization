import { buildWorkQueue } from './distributed.js';
import { detectPhaseTransitions } from './registry.js';

export function canonicalCoverage(records) {
  return {
    records: records.length,
    verified: records.filter(record => record.verification.valid).length,
    provenOptimal: records.filter(record => record.evidence.state === 'proven_optimal').length,
    families: Object.fromEntries([...Map.groupBy(records, record => record.family)]
      .map(([family, values]) => [family, values.length])),
    openDistributedTasks: buildWorkQueue(records).length,
    phaseTransitions: detectPhaseTransitions(records).length,
    adaptivelyImproved: records.filter(record => record.adaptiveImprovement).length
  };
}
