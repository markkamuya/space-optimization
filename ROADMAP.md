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

## Milestones 10–15 — research release 2

10. **Substantial dataset:** 304 verified records across a 16×16 isosceles grid
    and 48 scalene slices.
11. **Solver program:** deterministic horizontal, vertical, and diagonal
    lattice portfolio with budgets, traces, environments, and retained winners.
12. **Bounds:** rigorous container and homogeneous count bounds with explicit
    gaps; unsupported proof methods remain visibly unsupported.
13. **Research phase map:** every map cell is computed, classified from solver
    descriptors, and accompanied by sampling distance and gap opacity.
14. **Community release:** contributor attribution, leaderboard, walkthrough,
    challenge and dispute templates, governance, and correction policy.
15. **Archival release:** immutable JSON, SHA-256 checksum, citation and Zenodo
    metadata, methodology, changelog, data license, and deposit archive.

**Status:** implemented as release `2.0.0`. DOI metadata and deposit package are
ready; an actual DOI requires an authorized archival-provider deposit.

## Milestones 16–21 — v1 release gate

16. **Independent replication:** a dependency-free Python implementation
    rebuilds and verifies all 304 records and reproduces every fingerprint.
17. **Competitive optimization:** seven-strategy tournament contract, boundary
    repair, deterministic budgets, environments, checkpoints, and resume policy.
18. **Mathematical evidence:** versioned proof certificates, exact-tiling
    machine check, rigorous count bounds, and mandatory human proof review.
19. **Literature-backed Atlas:** primary-source registry with claim-level scope
    and explicit exclusions for adjacent problems.
20. **Community beta:** end-to-end acceptance tests for new, duplicate, invalid,
    and proof-review submissions plus public failure-stage reporting.
21. **v1 publication:** checksummed `1.0.0-rc.1` archive, visible release gates,
    citation metadata, and final-tag policy.

**Status:** all internal gates pass. `v1.0.0` remains correctly blocked until a
real external contribution is processed and an authorized archive mints a DOI.

## Milestones 22–30 — canonical Atlas v2

22. **Canonical dataset:** all 304 experiments now share stable record and
    experiment identifiers, coordinates, provenance, evidence, history, and
    downloadable JSON/CSV representations.
23. **Trusted verification:** every record carries a fingerprint, verifier
    version, tolerance policy, and deterministic certificate; JavaScript and
    independent Python replay remain release gates.
24. **Reproducible laboratory:** each record publishes its seed, algorithm
    version, declared budget, and an executable `atlas:experiment` command.
25. **Computed phase map:** the interface is driven by the canonical registry
    and publishes 38 transitions backed by adjacent computed samples.
26. **Community submission system:** CI verifies, renders, compares, and then
    rebuilds the canonical registry; proof and citation review remains human.
27. **Best-known registry:** fingerprints detect duplicates, normalized
    experiment IDs identify incumbents, inferior candidates are classified,
    and immutable history preserves attribution.
28. **Research UX:** the hosted Atlas provides full-text and evidence filtering,
    deep-linked record pages, coordinates, bounds, certificates, comparisons,
    and JSON/CSV downloads.
29. **Distributed exploration:** a versioned queue publishes 301 prioritized
    tasks with budgets and strict result-validation contracts.
30. **Atlas v2 release:** canonical snapshot, checksum, schema, manifest,
    methodology, citation metadata, and limitations are publication-ready.

**Status:** implemented as `2.0.0`. A DOI remains explicitly pending an
authorized deposit; distributed tasks and future record improvements remain
open-ended research work.

## Milestones 31–36 — operational research release

31. **Production recovery:** Vercel uses a dedicated static Vite build instead
    of embedding the 13 MB dataset in an auxiliary server artifact.
32. **Scientific audit:** all 304 coordinates, fingerprints, bounds, evidence
    labels, and neighboring parameter slices are replayed and summarized in a
    downloadable audit report.
33. **Stronger optimization:** deterministic adaptive boundary search combines
    multi-resolution boundary anchors, continuous orientation samples, spatial
    collision pruning, and optional reflection. The release retains only
    independently valid improvements and preserves incumbent provenance.
34. **Community launch:** twelve high-priority, machine-verifiable challenges
    are published with starter commands, budgets, evidence requirements, and
    honest external-contributor counters.
35. **Mathematical strengthening:** finite candidate-domain clique-cover
    certificates can prove domain optima without being mislabeled as global
    continuous optima; exact tiling and global area/count certificates remain
    distinct.
36. **Archival publication:** a twelve-artifact frozen manifest, per-file
    SHA-256 digests, canonical archive, Zenodo metadata, citation data, and
    GitHub release are prepared. DOI remains null until an authorized provider
    actually mints one.

**Status:** code-complete. External participation and DOI minting are facts
that the project records only after they happen.
