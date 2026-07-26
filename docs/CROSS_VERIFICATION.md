# Independent cross-verification

Release candidates must pass both the JavaScript verifier used by the Atlas and
the dependency-free Python implementation in `independent_verifier/`.

The Python verifier shares no geometry code with the application. It rebuilds
triangles from side lengths, applies rigid transforms, checks rectangle
containment and pairwise separating axes, recomputes utilization, and implements
the canonical FNV-1a fingerprint independently.

```sh
npm run atlas:research
npm run atlas:cross-verify
```

Agreement is necessary but not sufficient for a proof claim. The two
implementations intentionally use different languages and standard libraries,
but their numerical-policy constants remain a shared specification and should
also receive external review.
