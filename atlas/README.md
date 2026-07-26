# Triangle Packing Atlas dataset

This directory is the version-controlled public record of verified triangle
packings.

Records are grouped by triangle family:

```text
atlas/
  right/
  equilateral/
  isosceles/
  scalene/
  heterogeneous/
```

Every JSON record must:

1. conform to `schemas/record.schema.json`;
2. pass `npm run atlas:verify -- <record>`;
3. include explicit placements and provenance;
4. use an evidence state from `docs/DATA_STANDARD.md`;
5. avoid claiming optimality without human-reviewed proof metadata.

The first control record is `right/right-grid-2x1.json`, a proven 100%
construction in which congruent right-triangle pairs tile a rectangle.
