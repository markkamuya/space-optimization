# Atlas data standard

The canonical exchange format is `triangle-packing-atlas/v1`. Problems and
records are described by JSON Schema files in `schemas/`.

Every record contains:

- a stable kebab-case id;
- a complete problem definition;
- explicit placements in radians and container coordinates;
- a named construction or solver;
- an evidence state;
- provenance sufficient to reproduce computational work.

Evidence states are:

- `proven_optimal`: human-reviewed proof reaches a rigorous bound;
- `published`: attributed to cited literature;
- `verified_construction`: coordinates pass independent verification;
- `best_computational`: strongest verified submitted result for the problem;
- `candidate`: awaiting review or independent reproduction;
- `open`: benchmark without a satisfactory construction;
- `disputed`: conflicting evidence or unstable verification.

Software verification can promote a candidate to `verified_construction`; it
cannot promote any record to `proven_optimal`.

Coordinates use the lower-left container corner as `(0, 0)`. Angles are radians
counterclockwise. Side triples may be supplied in any order but are normalized
for fingerprints.
