# Atlas v2 research release

Atlas v2 is the first release in which the public interface, downloadable
dataset, experiment reproducer, verifier, record comparison, and distributed
work queue all use the same canonical record registry.

## Release contents

- 304 coordinate-complete and independently verified experiments.
- Stable identifiers for records and normalized experiments.
- A verification certificate, fingerprint, tolerance policy, and verifier
  version on every record.
- Explicit evidence claims separating proven controls from verified best-known
  computational results.
- Rigorous lower and upper bounds with visible optimality gaps.
- Deterministic seeds, algorithm versions, solver budgets, and one-command
  reproduction instructions.
- 38 observed pattern transitions supported by adjacent computed samples.
- JSON and CSV snapshots plus a checksummed immutable release manifest.
- 301 prioritized distributed tasks that require coordinates and an independently
  verified improvement.
- Eleven canonical records improved by deterministic adaptive boundary search.
- A complete audit with zero critical or major findings across all 304 records.
- Twelve public community challenges selected from the highest-priority gaps.

## Reproduction

```bash
npm ci
npm run atlas:v2
npm run atlas:experiment -- --record iso-a60-r1p5
npm run atlas:cross-verify
```

The release checksum is written to `public/atlas-v2.sha256`. Rebuilding on a
supported runtime must reproduce every record fingerprint. Build-environment
metadata is not used as scientific evidence.

The same canonical release is also published through
`public/atlas-v2-shards.json` as four ordered record shards. The root index and
each shard carry SHA-256 digests, byte counts, order, and boundary record IDs.
Release audits reject missing, reordered, duplicated, truncated, or modified
shards and require reconstruction to match `public/atlas-v2.json` exactly. The
monolithic file remains available for backward compatibility.

The web explorer loads the root index and verifies every shard with the Web
Crypto API before making records searchable. It reports record/shard progress
while loading. If any shard is unavailable or fails integrity checks, the
explorer discards the partial assembly and accepts `public/atlas-v2.json` only
after matching `public/atlas-v2.sha256`. If neither path verifies, research
records remain hidden and the interface reports that verified data is
unavailable; partial or unverified results are never presented as canonical.

The frozen archival manifest records individual SHA-256 digests for the
canonical JSON, CSV, audit, work queue, challenges, schemas, methodology,
certificate policy, sharded release index and payloads, citation data, and
archival-provider metadata.

## Claim boundary

Three exact right-triangle controls are marked proven optimal because their
verified lower bound matches a rigorous area bound. Other records are
`verified_best_known`: they are valid lower bounds and release incumbents, not
claims of global optimality. A DOI field remains null until an authorized
archival-provider deposit occurs.

## Community and distributed computation

Submissions pass schema validation, geometry replay, fingerprint deduplication,
and incumbent comparison. Proofs and citations still require human review.
Workers may select tasks from `public/work-queue-v2.json`; results without an
explicit seed, complete placements, or a strict improvement are rejected before
the ordinary submission pipeline.

### Coordinated worker runs

The queue supports durable, digest-bound leases so parallel workers do not
silently duplicate the same task:

```sh
npm run atlas:worker-leases -- claim leases.json worker.json
npm run atlas:worker-leases -- checkpoint leases.json checkpoint.json
```

Completed envelopes are tied to the exact task, baseline, worker, lease token,
budget, deterministic seed, and solver version. Ingest results with:

```sh
npm run atlas:worker-results -- leases.json result-a.json result-b.json --output evidence.json
```

Ingestion replays geometry, rejects expired or stolen leases, deduplicates
fingerprints, ranks improvements deterministically, and seals the review in a
SHA-256 evidence statement.
