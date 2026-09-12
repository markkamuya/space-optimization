export const WORKSHOP_REVIEW_PACKET_FORMAT = 'triangle-packing-workshop-review/v1';
export const WORKSHOP_CONTRIBUTION_PLAN_FORMAT = 'triangle-packing-workshop-contribution-plan/v1';

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

export function createWorkshopContributionPlan(packet, challenge) {
  if (packet?.format !== WORKSHOP_REVIEW_PACKET_FORMAT || !challenge?.challengeId || !challenge?.issueUrl) {
    throw new TypeError('A review packet and exact open challenge are required.');
  }
  const candidatePath = `atlas/submissions/${packet.candidateFile}`;
  const reviewFile = packet.candidateFile.replace(/\.json$/, '-review.md');
  const reportFile = packet.candidateFile.replace(/\.json$/, '-report.svg');
  return {
    format: WORKSHOP_CONTRIBUTION_PLAN_FORMAT,
    repository: 'markkamuya/space-optimization',
    challenge: { id: challenge.challengeId, url: challenge.issueUrl },
    candidatePath,
    files: [
      { kind: 'candidate', filename: packet.candidateFile, destination: candidatePath, required: true },
      { kind: 'review', filename: reviewFile, destination: reviewFile, required: true },
      { kind: 'visual-report', filename: reportFile, destination: reportFile, required: true }
    ],
    commands: [
      `npm run atlas:submission -- ${candidatePath}`,
      `npm run atlas:report -- ${candidatePath} ${reportFile}`
    ],
    steps: [
      `Create a focused branch for ${challenge.challengeId}; nothing has been submitted from the browser.`,
      `Place ${packet.candidateFile} at ${candidatePath} and keep ${reviewFile} with the review materials.`,
      'Run both commands below and keep their unedited output and generated SVG report.',
      `Open a pull request that links ${challenge.challengeId} and requests independent verification and maintainer review.`
    ],
    boundary: packet.boundary
  };
}

export function workshopContributionMarkdown(plan) {
  if (plan?.format !== WORKSHOP_CONTRIBUTION_PLAN_FORMAT) throw new TypeError('A supported contribution plan is required.');
  return [
    `# Web-to-Git handoff for ${plan.challenge.id}`,
    '',
    `Repository: \`${plan.repository}\``,
    `Suggested candidate path: \`${plan.candidatePath}\``,
    '',
    '## Files',
    '',
    ...plan.files.map(file => `- [ ] \`${file.filename}\`${file.destination !== file.filename ? ` → \`${file.destination}\`` : ''}`),
    '',
    '## Commands',
    '',
    ...plan.commands.map(command => `- [ ] \`${command}\``),
    '',
    '## Steps',
    '',
    ...plan.steps.map(step => `- [ ] ${step}`),
    '',
    `> ${plan.boundary}`,
    ''
  ].join('\n');
}
