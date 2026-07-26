# Triangle Packing Atlas roadmap

The Atlas separates mathematical claims, verified coordinates, computational
hypotheses, and open questions. A milestone is complete only when its capability
is reproducible in the repository.

## Milestones 1–5 — foundation

1. **Independent verification:** numerical policy, geometry checks, stable
   fingerprints, and a command-line verifier.
2. **Data standard:** versioned problem and record schemas, evidence states,
   provenance, and the first proven control.
3. **Reference constructions:** exact right-triangle grids and finite
   equilateral row constructions.
4. **Benchmark corpus:** known-optimum controls, reference cases, computational
   fixtures, and continuous-integration thresholds.
5. **Solver contract:** registered solvers, common result objects, independent
   scoring, and reproducible comparison.

Implementation details are in `docs/FOUNDATION_MILESTONES.md`.

## Milestone 6 — Atlas interface

**Goal:** Make relationships across the dataset visually explorable.

- Evidence-aware phase map with triangle-shape and rectangle-ratio controls.
- Triangle-family filtering and verified-record gallery.
- Individual packing viewer with exact metrics and provenance.
- Pattern comparison and boundary-waste decomposition.
- Historical improvement timelines and open-problem browser.

**Status:** implemented in the Atlas-first hosted interface.

## Milestone 7 — contribution pipeline

**Goal:** Let an external contributor safely submit an improved packing.

- Versioned submission template and pull-request checklist.
- Structural and independent geometry checks.
- Duplicate fingerprints and best-known-record comparison.
- Automated SVG packing reports.
- Challenge issue template and beginner labels.
- Mandatory human review for proof and citation claims.

**Status:** implemented in `.github`, `cli`, and `docs/CONTRIBUTION_PIPELINE.md`.

## Milestone 8 — first public Atlas release

**Goal:** Publish a small, defensible body of knowledge.

- Right, equilateral, and right-isosceles verified slices.
- Several rectangle ratios and exact known-optimum controls.
- Explicit open isosceles, equilateral, and scalene regions.
- Coordinate-complete downloadable release JSON.
- Versioned release manifest and DOI-ready archival checklist.

**Status:** `1.0.0-preview`; seven verified records and four open problems.

## Milestone 9 — research expansion

**Goal:** Provide durable structure for a sustained open endeavor.

- Scalene and finite/asymptotic research programs.
- Versioned upper-bound methods.
- Distributed challenge manifest with independent replay.
- Primary-literature ingestion template.
- Classroom and academic challenge pathway.
- Immutable periodic dataset releases.

**Status:** program and manifest scaffolding published; research results and
partnerships remain ongoing by nature.
