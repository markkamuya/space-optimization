# Release and archival policy

Every release contains:

- semantic version and date;
- immutable JSON snapshot;
- SHA-256 checksum;
- exact coordinates, provenance, solver metadata, and evidence status;
- verification and benchmark commands;
- methodology, changelog, contributor registry, license, and citation metadata;
- correction links without rewriting historical archives.

`npm run atlas:archive` creates the deposit archive after regenerating and
verifying the dataset. A DOI must be minted by an authorized archival provider
such as Zenodo. Repository automation intentionally does not invent or reserve
a DOI.
