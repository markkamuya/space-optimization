#!/usr/bin/env sh
set -eu

npm run atlas:v2
npm run atlas:audit
npm run atlas:challenges
npm run atlas:cross-verify
npm run atlas:freeze
mkdir -p releases
tar -czf releases/triangle-packing-atlas-2.0.0.tgz \
  public/atlas-v2.json \
  public/atlas-v2.csv \
  public/atlas-v2.sha256 \
  public/audit-v2.json \
  public/work-queue-v2.json \
  public/community-challenges-v2.json \
  schemas/canonical-release.schema.json \
  schemas/finite-domain-certificate.schema.json \
  releases/2.0.0-canonical.json \
  releases/2.0.0-archive-manifest.json \
  releases/2.0.0-archive-manifest.sha256 \
  CITATION.cff \
  .zenodo.json \
  codemeta.json \
  DATA_LICENSE.md \
  CHANGELOG.md \
  CONTRIBUTORS.json \
  GOVERNANCE.md \
  docs/METHODOLOGY_V2.md \
  docs/ATLAS_V2_RELEASE.md \
  docs/MATHEMATICAL_CERTIFICATES_V2.md \
  docs/COMMUNITY_CHALLENGE_V2.md \
  docs/RELEASE_POLICY.md
printf '%s\n' "Wrote releases/triangle-packing-atlas-2.0.0.tgz"
