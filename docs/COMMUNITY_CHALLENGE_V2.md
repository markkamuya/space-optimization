# Atlas v2 community challenge

The first public challenge set contains twelve high-priority experiments selected
from the canonical distributed work queue.

## Choose and reproduce

Download `public/community-challenges-v2.json`, choose an open challenge, and
reproduce its incumbent:

```bash
npm ci
npm run atlas:experiment -- --record <record-id>
```

## Submit an improvement

An admissible packing must include complete coordinates, a deterministic seed,
the solver and version, contributor attribution, and a strictly better verified
lower bound. A rigorous upper-bound improvement may be submitted without a new
packing when its certificate is reviewable.

Run the submission checks and include the generated visual report in a pull
request. Automated checks validate structure, geometry, fingerprints, and the
incumbent comparison. Maintainers review attribution, proofs, and citations.

The project never treats simulated acceptance tests as external participation.
The external-contribution gate changes only after a pull request from a genuine
non-maintainer contributor is accepted.
