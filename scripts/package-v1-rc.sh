#!/usr/bin/env sh
set -eu

npm run atlas:research
npm run atlas:beta
npm run atlas:cross-verify
npm run atlas:certificate -- proofs/right-grid-2x1.json atlas/right/right-grid-2x1.json
node scripts/build-v1-release.js
tar -czf releases/triangle-packing-atlas-1.0.0-rc.1.tgz \
  public/atlas-research-v2.json \
  public/atlas-research-v2.sha256 \
  public/build-environment.json \
  public/community-beta.json \
  public/release-status.json \
  releases/1.0.0-rc.1.json \
  proofs/right-grid-2x1.json \
  literature/registry.json \
  CITATION.cff .zenodo.json codemeta.json DATA_LICENSE.md CHANGELOG.md \
  CONTRIBUTORS.json GOVERNANCE.md docs/METHODOLOGY_V2.md docs/CROSS_VERIFICATION.md \
  docs/V1_RELEASE_GATES.md literature/CLAIM_POLICY.md
printf '%s\n' "Wrote releases/triangle-packing-atlas-1.0.0-rc.1.tgz"
