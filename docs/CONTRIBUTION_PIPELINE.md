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
