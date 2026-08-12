#!/usr/bin/env sh
set -eu

npm run atlas:v2
npm run atlas:audit
npm run atlas:challenges
npm run atlas:cross-verify
npm run atlas:freeze
mkdir -p releases
node scripts/build-v2-archive.js
