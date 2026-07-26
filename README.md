<div align="center">

# Triangle Packing Atlas

**A living, reproducible map of triangle-packing knowledge.**

Verified constructions, best-known computational records, rigorous controls,
and explicitly unsolved regions—explorable across triangle shape and container geometry.

[Explore the live atlas](https://triangle-packing-atlas.vercel.app/) ·
[Download the research dataset](https://triangle-packing-atlas.vercel.app/atlas-v2.json) ·
[Read the methodology](docs/METHODOLOGY_V2.md) ·
[Contribute a packing](docs/SUBMISSION_WALKTHROUGH.md)

[![CI](https://github.com/markkamuya/space-optimization/actions/workflows/ci.yml/badge.svg)](https://github.com/markkamuya/space-optimization/actions/workflows/ci.yml)
[![Release](https://img.shields.io/badge/release-2.0.0-1b2723)](releases/2.0.0-canonical.json)
[![Records](https://img.shields.io/badge/research_records-304-dfff55)](https://triangle-packing-atlas.vercel.app/atlas-research-v2.json)
[![Dataset license](https://img.shields.io/badge/dataset-CC_BY_4.0-f17b50)](CITATION.cff)

</div>

## See the atlas in action

The signature view lets you change triangle geometry and rectangle aspect ratio
and watch the dominant observed packing pattern change. The walkthrough below
was recorded from the deployed application and also visits verified records and
the open-problem board.

<p align="center">
  <a href="https://triangle-packing-atlas.vercel.app/">
    <img src="docs/assets/atlas-demo.gif?v=2" alt="Triangle Packing Atlas walkthrough showing the interactive phase map, verified records, pattern comparisons, research roadmap, and open challenges" width="640">
  </a>
</p>

> The atlas distinguishes a valid construction from a proof of optimality.
> A high-density layout is not presented as optimal unless it meets a rigorous,
> reviewable upper bound.

## What the project provides

| Layer | Purpose |
| --- | --- |
| **Interactive atlas** | Explore phase maps, triangle families, packing layouts, comparisons, boundary waste, timelines, and open problems. |
| **Versioned dataset** | Preserve coordinates, normalized inputs, provenance, evidence state, fingerprints, and reproducible solver traces. |
| **Independent verification** | Replay every published record with separate JavaScript and Python geometry implementations. |
| **Packing laboratory** | Generate deterministic baselines, lattice candidates, adaptive boundary repairs, and independently verified improvements. |
| **Contribution pipeline** | Validate submissions, detect duplicates, compare records, produce visual reports, and preserve attribution. |

## Research scope

The canonical `2.0.0` research release contains **304 independently verified
records** across right, equilateral, and isosceles families. It includes:

- known-optimum control cases;
- verified finite constructions and deterministic solver traces;
- computed phase classifications and boundary-waste measurements;
- rigorous area and count bounds where available;
- clearly labeled open regions and public challenges;
- checksummed, DOI-ready archival artifacts.
- a downloadable 304-record scientific audit and twelve public compute challenges;
- eleven retained adaptive-boundary improvements in the canonical v2 snapshot.

Evidence is intentionally graded:

```text
open problem
    ↓
computational candidate
    ↓
verified construction
    ↓
best known
    ↓
proven optimal
```

See the [data standard](docs/DATA_STANDARD.md), [numerical
policy](docs/NUMERICAL_POLICY.md), and [release policy](docs/RELEASE_POLICY.md)
for the exact meaning of each state.

## Quick start

Requirements: a current Node.js release and npm.

```bash
git clone https://github.com/markkamuya/space-optimization.git
cd space-optimization
npm install
npm run dev
```

Vite prints the local application URL. For a production build:

```bash
npm run build
npm run preview
```

## Reproduce the evidence

Run the complete code and build checks:

```bash
npm run check
```

Rebuild and independently verify the canonical research release:

```bash
npm run atlas:research
npm run atlas:v2
npm run atlas:audit
npm run atlas:cross-verify
```

Useful focused commands:

```bash
npm run atlas:verify -- atlas/right/right-grid-2x1.json
npm run atlas:benchmark
npm run atlas:certificate -- proofs/right-grid-2x1.json atlas/right/right-grid-2x1.json
npm run atlas:experiment -- --record iso-a60-r1p5
npm run atlas:adaptive
npm run atlas:v1-rc
```

## Repository guide

```text
src/
  atlas/          evidence states, verification, fingerprints
  constructions/ exact and reference construction generators
  core/           problem definitions, seeded randomness, exports
  geometry/       transforms, predicates, intersections
  rendering/      packing and convergence visualizations
  solvers/        scoring, compact baselines, multi-start search
atlas/            version-controlled packing records
benchmarks/       reproducible solver fixtures
independent_verifier/
                  separate Python verification implementation
schemas/          versioned data contracts
scripts/          release, archive, and research tooling
test/             geometry, solver, and regression tests
docs/             methods, governance, and contribution guidance
```

The architectural boundaries are documented in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Contributing

Improvements are welcome as packing records, proofs, literature references,
verification work, solver advances, or interface changes.

For a packing submission:

1. Start from the [submission walkthrough](docs/SUBMISSION_WALKTHROUGH.md).
2. Add a record that conforms to the versioned schema.
3. Run `npm run atlas:submission -- atlas/path/to/candidate.json`.
4. Open a pull request and review the automated geometry and record-comparison report.

Every accepted scientific claim must include coordinates, provenance,
verification status, and reproducible evidence. Proof and citation claims
remain subject to human review. General engineering guidance is in
[docs/CONTRIBUTING.md](docs/CONTRIBUTING.md); the complete publication flow is
in [docs/CONTRIBUTION_PIPELINE.md](docs/CONTRIBUTION_PIPELINE.md).

## Release status

Atlas v2 unifies the public interface and scientific artifacts around one
canonical registry. Every record includes coordinates, provenance, evidence
state, bounds, a verification certificate, immutable history, and an executable
reproduction command. See the [v2 release notes](docs/ATLAS_V2_RELEASE.md).

The release is checksummed and DOI-ready. A DOI is not claimed until the frozen
snapshot is deposited with an authorized archival provider.

The [scientific audit](public/audit-v2.json), [community challenge
set](docs/COMMUNITY_CHALLENGE_V2.md), and [certificate
policy](docs/MATHEMATICAL_CERTIFICATES_V2.md) document the operational research
gates added after the initial v2 registry.

## Citation and license

Use the repository's [CITATION.cff](CITATION.cff) metadata when citing the
dataset. The research dataset is published under **CC BY 4.0**. Release
artifacts include checksums so archived snapshots can be identified and
reproduced exactly.

---

<div align="center">

**Open computational geometry should make uncertainty visible.**

[Live atlas](https://triangle-packing-atlas.vercel.app/) ·
[Open problems](https://triangle-packing-atlas.vercel.app/#challenges) ·
[Research program](docs/RESEARCH_EXPANSION.md)

</div>
