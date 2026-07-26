# Atlas Release 1 — defensible preview

Release 1 is deliberately small. It establishes a citable, reproducible nucleus
instead of filling the interface with unsupported claims.

## Included knowledge

- Exact right-triangle rectangular pairings at several aspect ratios.
- A right-isosceles square control case.
- Finite equilateral alternating-row constructions at three rectangle ratios.
- Four explicitly open regions spanning isosceles, equilateral, and scalene work.
- Exact coordinates, inputs, provenance, verification fingerprints, evidence
  states, and downloadable JSON for every published record.

The release file is generated with:

```sh
npm run atlas:release
```

The generated `public/atlas-v1.json` is the DOI-ready snapshot payload. Before a
DOI deposit, maintainers must freeze the version, add repository and author
metadata, select an archival provider, and review licensing and citations.

## Claim policy

`proven_optimal` means the construction matches a rigorous upper bound and
includes reviewable proof metadata. `verified_construction` means only that the
coordinates satisfy the stated geometry. Interactive phase-map regions marked
“hypothesis” or “open” are discovery aids, not published records.
