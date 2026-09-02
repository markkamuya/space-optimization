export const WORKSHOP_REVIEW_PACKET_FORMAT = 'triangle-packing-workshop-review/v1';

export function createWorkshopReviewPacket(bundle, validation) {
  if (!bundle?.checksum || !bundle?.candidate?.id || !validation?.eligibleForContribution) {
    throw new TypeError('A locally eligible, checksummed Workshop bundle is required.');
  }
  return {
    format: WORKSHOP_REVIEW_PACKET_FORMAT,
    candidateFile: `${bundle.candidate.id}.json`,
    baseline: bundle.baseline,
    release: bundle.release,
    workshopChecksum: bundle.checksum,
    localAssessment: {
      disposition: validation.assessment.disposition,
      geometryValid: validation.geometryValid,
      candidateUtilization: validation.comparison.candidateUtilization,
      incumbentUtilization: validation.comparison.baselineUtilization,
      difference: validation.comparison.delta
    },
    verifierCommand: bundle.handoff.verifyCommand,
    checklist: [
      'Attach the candidate JSON and retain this Workshop checksum.',
      'Run the full verifier command and attach its unedited report.',
      'Describe the deterministic method, seed, version, and contributor attribution.',
      'Request maintainer and independent verification before claiming an improvement or proof.'
    ],
    boundary: 'This packet records a local improvement candidate. It is not publication, proof, independent verification, or maintainer approval.'
  };
}

export function workshopReviewMarkdown(packet) {
  if (packet?.format !== WORKSHOP_REVIEW_PACKET_FORMAT) throw new TypeError('A supported Workshop review packet is required.');
  const percent = value => `${(value * 100).toFixed(6)}%`;
  return [
    '# Triangle Packing Atlas candidate review',
    '',
    `- Baseline: \`${packet.baseline.id}\``,
    `- Candidate file: \`${packet.candidateFile}\``,
    `- Verified release: \`${packet.release.version}\``,
    `- Workshop checksum: \`${packet.workshopChecksum}\``,
    `- Local candidate fill: ${percent(packet.localAssessment.candidateUtilization)}`,
    `- Published incumbent fill: ${percent(packet.localAssessment.incumbentUtilization)}`,
    `- Local difference: ${percent(packet.localAssessment.difference)}`,
    '',
    '## Reproduce',
    '',
    `\`${packet.verifierCommand}\``,
    '',
    '## Review checklist',
    '',
    ...packet.checklist.map(item => `- [ ] ${item}`),
    '',
    `> ${packet.boundary}`,
    ''
  ].join('\n');
}

export function resolveWorkshopChallenge(challenges, baseline) {
  if (!Array.isArray(challenges) || !baseline?.id || !baseline?.verification?.fingerprint) return null;
  const challenge = challenges.find(item =>
    item?.status === 'open' &&
    item.recordId === baseline.id &&
    item.baseline?.fingerprint === baseline.verification.fingerprint
  );
  if (!challenge || !/^TPA-C\d{2}$/.test(challenge.challengeId)) return null;
  try {
    const issue = new URL(challenge.issueUrl);
    if (issue.protocol !== 'https:' || issue.hostname !== 'github.com' || !/^\/markkamuya\/space-optimization\/issues\/\d+$/.test(issue.pathname)) return null;
    return { ...challenge, issueUrl: issue.href };
  } catch {
    return null;
  }
}

export function workshopGitHubSummary(packet, challenge) {
  if (packet?.format !== WORKSHOP_REVIEW_PACKET_FORMAT || !challenge?.challengeId) {
    throw new TypeError('A review packet and exact challenge are required.');
  }
  return [
    `Local candidate prepared for ${challenge.challengeId} (${packet.baseline.id}).`,
    `Candidate file: ${packet.candidateFile}`,
    `Workshop checksum: ${packet.workshopChecksum}`,
    `Local fill: ${(packet.localAssessment.candidateUtilization * 100).toFixed(6)}%`,
    `Published fill: ${(packet.localAssessment.incumbentUtilization * 100).toFixed(6)}%`,
    `Local difference: ${(packet.localAssessment.difference * 100).toFixed(6)}%`,
    `Verifier: ${packet.verifierCommand}`,
    'Candidate JSON, unedited verifier output, and reviewer packet will be attached separately.',
    packet.boundary
  ].join('\n');
}
