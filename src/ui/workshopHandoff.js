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
