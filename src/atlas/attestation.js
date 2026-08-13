import { createHash } from 'node:crypto';

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function candidatePayloadDigest(payload) {
  return sha256(payload);
}

export function incumbentSnapshotDigest(records) {
  return sha256(JSON.stringify(records));
}

function attestedResult(result) {
  return {
    path: result.path,
    candidateSha256: result.candidateSha256 ?? null,
    candidatePayloadBase64: result.candidatePayloadBase64 ?? null,
    disposition: result.report?.disposition ?? null,
    incumbentIndexDigest: result.report?.comparison?.incumbentIndexDigest ?? null,
    errorCode: result.error?.code ?? null
  };
}

export function createSubmissionAttestation(incumbentIndexDigest, results, incumbentSnapshot = null) {
  const statement = {
    format: 'triangle-packing-submission-attestation/v1',
    incumbentIndexDigest,
    incumbentSnapshotSha256: incumbentSnapshot === null ? null : incumbentSnapshotDigest(incumbentSnapshot),
    results: results.map(attestedResult)
  };
  return Object.freeze({ ...statement, sha256: sha256(JSON.stringify(statement)) });
}

export function verifySubmissionAttestation(attestation, results, incumbentSnapshot = null) {
  if (attestation?.format !== 'triangle-packing-submission-attestation/v1') return false;
  const expected = createSubmissionAttestation(attestation.incumbentIndexDigest, results, incumbentSnapshot);
  return expected.sha256 === attestation.sha256 &&
    JSON.stringify(expected.results) === JSON.stringify(attestation.results);
}
