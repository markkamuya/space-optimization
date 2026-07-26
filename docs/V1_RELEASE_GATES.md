# Version 1 release gates

`1.0.0-rc.1` is the complete internal release candidate. The final `v1.0.0`
tag is created only after every gate is evidenced:

| Gate | RC status | Evidence |
| --- | --- | --- |
| JavaScript verification | passed | `npm test` |
| Independent Python replay | passed | `npm run atlas:cross-verify` |
| Exact control certificate | passed | `npm run atlas:certificate -- ...` |
| Community automation beta | passed | `npm run atlas:beta` |
| Real external contribution | pending | accepted third-party pull request |
| Archival DOI | pending | provider deposit record |

The pending gates require independent people or external archival authority.
They cannot be satisfied by generated fixtures, self-review, invented
contributors, placeholder DOIs, or a local tag.
