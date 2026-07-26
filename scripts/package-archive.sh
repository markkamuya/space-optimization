#!/usr/bin/env sh
set -eu

npm run atlas:research
npm test
mkdir -p releases
tar -czf releases/triangle-packing-atlas-2.0.0.tgz \
  public/atlas-research-v2.json \
  public/atlas-research-v2.sha256 \
  CITATION.cff \
  .zenodo.json \
  codemeta.json \
  DATA_LICENSE.md \
  CHANGELOG.md \
  CONTRIBUTORS.json \
  GOVERNANCE.md \
  docs/METHODOLOGY_V2.md \
  docs/RELEASE_POLICY.md
printf '%s\n' "Wrote releases/triangle-packing-atlas-2.0.0.tgz"
