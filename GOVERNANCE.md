# Governance

## Roles

- **Contributors** submit reproducible coordinates, bounds, reproductions, code,
  corrections, or literature entries.
- **Reviewers** verify geometry reports and inspect provenance.
- **Proof reviewers** assess mathematical arguments and primary citations.
- **Maintainers** merge records, cut releases, and administer disputes.

No reviewer may approve their own proof claim without a second reviewer.

## Record disputes

Open a `dispute` issue naming the record id, contested field, reproducible
evidence, and requested correction. The record remains available but becomes
`disputed` when the challenge is credible. Resolution links both the original
and correcting release; immutable snapshots are never rewritten.

## Corrections

Errors receive a new dataset release, changelog entry, replacement record id or
version, and a machine-readable `supersedes` relationship. Security problems
follow `SECURITY.md`; mathematical disagreement follows the public dispute
process.

## Attribution

Accepted records preserve contributor name, solver/construction provenance, and
review history. Leaderboards rank records, not personal worth. Reproductions,
negative results, bounds, corrections, and datasets receive attribution too.
