# Contribution pipeline

Start with `atlas/submissions/template.json` and open a pull request containing
the candidate record.

The automated review performs:

1. structural schema checks;
2. independent geometry verification;
3. canonical fingerprint duplicate detection;
4. comparison with records for the same normalized problem;
5. rejection of invalid, duplicate, or non-improving candidates;
6. generation of an SVG packing report for reviewer inspection.

Portable review bundles enter a tamper-evident quarantine ledger before any
record can be promoted. Maintainer decisions are append-only and bind the
reviewer, decision time, reason, automated evidence, and previous event hash.
A promotion plan is accepted only while the incumbent dataset digest still
matches the dataset used for review. It always publishes computational
submissions as `verified_construction`; software cannot promote a proof or
citation claim. The public contribution status reports lifecycle counts without
publishing candidate payloads or reviewer notes.

Run the same checks locally:

```sh
npm run atlas:submission -- atlas/path/to/candidate.json
npm run atlas:report -- atlas/path/to/candidate.json submission-report.svg
```

Automation cannot decide whether a proof is sound or a citation accurately
supports a claim. Records submitted as `published` or `proven_optimal` require a
maintainer to inspect primary sources or proof material before publication.

Challenges use the repository’s Atlas challenge issue template. Labels
`challenge` and `good first issue` distinguish reproducible starter work from
frontier research.
