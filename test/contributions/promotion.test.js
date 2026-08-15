import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { createSubmissionAttestation } from '../../src/atlas/attestation.js';
import { buildVerifiedIncumbentIndex, queryVerifiedIncumbentIndex } from '../../src/atlas/published.js';
import { verifyPacking } from '../../src/atlas/verifier.js';
import { createContributionLedger, recordContributionReview } from '../../src/contributions/ledger.js';
import { applyPromotionPlan, buildPromotionPlan, contributionStatus, verifyPromotionPlan } from '../../src/contributions/promotion.js';
import { readFile } from 'node:fs/promises';
import { canonicalRecord } from '../../src/research/registry.js';
import { boundBundle } from '../../src/research/bounds.js';
import { auditRecords } from '../../src/research/audit.js';

const problem = {
  name: 'promotion fixture', width: 4, height: 4, margin: 0, kerf: 0,
  fillSheet: false, maxPieces: 2, allowRotation: true, allowReflection: false,
  seed: 'promotion', triangles: [{ id: 'a', sides: [1, 1, 1] }]
};
const incumbentPlacement = [{ x: 1, y: 1, angle: 0, reflect: false }];
const incumbentVerification = verifyPacking(problem, incumbentPlacement);
const incumbent = {
  id: 'incumbent', problem, solution: { placements: incumbentPlacement },
  verification: { valid: true, fingerprint: incumbentVerification.fingerprint,
    utilization: incumbentVerification.metrics.utilization }
};

function approvedLedger() {
  const candidate = {
    format: 'triangle-packing-atlas/v1', id: 'candidate', problem: {
      ...problem, triangles: [...problem.triangles, { id: 'b', sides: [1, 1, 1] }]
    }, solution: { construction: 'fixture/v1', placements: [
      { x: 1, y: 1, angle: 0, reflect: false }, { x: 2, y: 1, angle: 0, reflect: false }
    ] }, evidence: { status: 'candidate', notes: 'candidate fixture' }, provenance: {
      generator: 'fixture', version: '1', seed: 'fixture', runtimeMs: 1,
      contributor: 'Researcher', license: 'CC-BY-4.0', createdAt: '2026-08-15T00:00:00.000Z'
    }
  };
  const payload = JSON.stringify(candidate);
  const index = buildVerifiedIncumbentIndex([incumbent]);
  const digest = queryVerifiedIncumbentIndex(index, null, null).sourceDigest;
  const result = {
    path: 'candidate.json', candidateSha256: (awaitHash(payload)),
    candidatePayloadBase64: Buffer.from(payload).toString('base64'),
    report: { disposition: 'improves_record', humanReviewRequired: false,
      comparison: { incumbentIndexDigest: digest } }
  };
  const snapshot = [incumbent];
  const bundle = { format: 'triangle-packing-submission-batch/v1', incumbentSnapshot: snapshot,
    results: [result], attestation: createSubmissionAttestation(digest, [result], snapshot) };
  const ledger = createContributionLedger(bundle, '2026-08-15T00:00:00.000Z');
  return recordContributionReview(ledger, { candidateId: ledger.entries[0].candidateId,
    reviewer: 'maintainer', decidedAt: '2026-08-15T01:00:00.000Z', decision: 'approve',
    allowUnsignedMigration: true,
    canonicalMetadata: { family: 'isosceles', pattern: 'reviewed contribution', parameters: {} } });
}

function awaitHash(payload) {
  return createHash('sha256').update(payload).digest('hex');
}

test('builds a deterministic, evidence-limited replacement plan', () => {
  const ledger = approvedLedger();
  const first = buildPromotionPlan(ledger, [incumbent], '2026-08-15T02:00:00.000Z');
  const second = buildPromotionPlan(ledger, [incumbent], '2026-08-15T02:00:00.000Z');
  assert.deepEqual(first, second);
  assert.equal(first.operations[0].operation, 'replace');
  assert.equal(first.operations[0].targetRecordId, 'incumbent');
  assert.equal(first.operations[0].publishEvidence, 'verified_construction');
  assert.equal(verifyPromotionPlan(first, ledger).valid, true);
  const applied = applyPromotionPlan([incumbent], first, ledger);
  assert.equal(applied.records[0].id, 'incumbent');
  assert.equal(applied.records[0].pattern, 'reviewed contribution');
  assert.equal(applied.records[0].provenance.contributor, 'Researcher');
  assert.equal(applied.records[0].history.at(-1).event, 'contribution_promotion');
  assert.equal(applied.receipt.receipts[0].fingerprint, first.operations[0].fingerprint);
});

test('refuses promotion after the incumbent set changes', () => {
  const ledger = approvedLedger();
  assert.throws(() => buildPromotionPlan(ledger, [{ ...incumbent, id: 'changed' }],
    '2026-08-15T02:00:00.000Z'), /stale_incumbent_index/);
});

test('promotion verification rejects evidence overpromotion', () => {
  const ledger = approvedLedger();
  const plan = buildPromotionPlan(ledger, [incumbent], '2026-08-15T02:00:00.000Z');
  plan.operations[0].publishEvidence = 'proven_optimal';
  assert.equal(verifyPromotionPlan(plan, ledger).valid, false);
});

test('public status summarizes each contribution state without candidate payloads', () => {
  const status = contributionStatus(approvedLedger(), { sha256: 'a'.repeat(64), keys: [] });
  assert.equal(status.counts.approved_for_promotion, 1);
  assert.equal(status.stages.length, 4);
  assert.equal(JSON.stringify(status).includes('candidatePayloadBase64'), false);
  assert.equal(status.reviewAuthority.enforced, true);
});

test('website explains live quarantine and promotion status in plain language', async () => {
  const [html, source] = await Promise.all([
    readFile(new URL('../../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../../src/main.js', import.meta.url), 'utf8')
  ]);
  assert.match(html, /id="contribution-status"/);
  assert.match(source, /Signed review policy/);
  assert.match(source, /no review keys registered yet/);
  assert.match(source, /Awaiting evidence review/);
  assert.match(source, /Approved for the next release/);
});

test('applied replacements satisfy the canonical scientific audit', () => {
  const verification = verifyPacking(problem, incumbentPlacement);
  const source = canonicalRecord({
    id: 'canonical-incumbent', family: 'isosceles',
    parameters: { apexAngle: 60, rectangleRatio: 1, scale: 4 },
    pattern: 'baseline pattern', status: 'best_computational', problem,
    solution: { construction: 'baseline/v1', placements: incumbentPlacement },
    verification: { valid: true, fingerprint: verification.fingerprint,
      utilization: verification.metrics.utilization, pieceCount: 1 },
    bounds: boundBundle(problem, { metrics: verification.metrics }),
    solver: { portfolio: [{ solver: 'baseline', iterations: 1, pieceCount: 1,
      utilization: verification.metrics.utilization }], winner: 'baseline',
      budget: { strategies: 1, orientationEvaluations: 1, deterministic: true },
      environment: { runtime: 'node', platform: 'portable-reference',
        architecture: 'portable-reference', algorithmVersion: 'baseline/v1' } },
    descriptors: { boundaryWaste: 1 - verification.metrics.utilization,
      boundaryGapAnalysis: { unusedArea: 16 - verification.metrics.triangleArea, priority: 'high' } },
    provenance: { generator: 'baseline', version: '1', seed: 'baseline', runtimeMs: 1,
      contributor: 'Atlas', license: 'CC-BY-4.0', createdAt: '2026-08-15T00:00:00.000Z' }
  });
  const ledger = approvedLedger();
  const adjusted = structuredClone(ledger);
  delete adjusted.sha256;
  adjusted.entries[0].events[0].canonicalMetadata.parameters = source.parameters;
  const event = adjusted.entries[0].events[0];
  const eventStatement = Object.fromEntries(Object.entries(event).filter(([key]) => key !== 'sha256'));
  event.sha256 = createHash('sha256').update(JSON.stringify(eventStatement)).digest('hex');
  adjusted.sha256 = createHash('sha256').update(JSON.stringify(adjusted)).digest('hex');
  const index = buildVerifiedIncumbentIndex([source]);
  adjusted.incumbentIndexDigest = queryVerifiedIncumbentIndex(index, null, null).sourceDigest;
  delete adjusted.sha256;
  adjusted.sha256 = createHash('sha256').update(JSON.stringify(adjusted)).digest('hex');
  const plan = buildPromotionPlan(adjusted, [source], '2026-08-15T02:00:00.000Z');
  const applied = applyPromotionPlan([source], plan, adjusted);
  const audit = auditRecords(applied.records);
  assert.equal(audit.passed, true, JSON.stringify({ findings: audit.findings, bounds: applied.records[0].bounds }));
});
