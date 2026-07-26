# Benchmark policy

The version-one corpus lives in `benchmarks/corpus.json` and contains three
types of case:

- `known_optimum`: a construction reaches a rigorous upper bound;
- `reference_construction`: a deterministic mathematical baseline;
- `open_computational`: a reproducible search case without an optimality proof.

Benchmarks specify validity and conservative quality thresholds. Thresholds
prevent regressions; they do not turn a heuristic result into a theorem.

Run:

```bash
npm run atlas:benchmark
```

Solver reports are accepted only after independent verification. Runtime
comparisons must record hardware and runtime versions before being published as
atlas evidence.
