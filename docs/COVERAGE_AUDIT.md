# N64 coverage audit

`sources/n64-coverage-audit-v1.json` is planning data. It does not authorize
downloads, catalog activation, trust, or redistribution. It records known signed
Authority source coverage and projects that still need artifact review.

Run validator from Authority repository root:

```console
node tools/validate-coverage-audit.mjs
```

Run unit tests with `node --test test/validate-coverage-audit.test.mjs`.
Tests reject removal of each of the nine artifact requirements and malformed
requirement lists. The validator checks planning metadata, not artifact bytes.

## Pull request CI

Add the `run-ci` PR label to approve validation for the current head. As in the
former Bitcadia64 GitHub workflow, approval requires the explicit label event.
After pushing another commit, remove and re-add `run-ci`. Other PR events fail
the approval check and skip validation. Manual workflow dispatch also runs checks.

The workflow runs unit tests, coverage validation, and strict publication
validation with Node.js 22. Its aggregate check is named `CI`; branch protection
can require that check.

## Consumer invocation

The validator also accepts an explicit root and audit path for consumers that vendor
the file and tool:

```console
node tools/validate-coverage-audit.mjs /path/to/worktree sources/n64-coverage-audit-v1.json
```

It requires unique project/source IDs, explicit status/reason fields, active signed
source scope, and artifact requirements for original URL, base identity, patch and
output hashes, rights, and reproducibility. It deliberately keeps GoldenEye X,
Goldfinger 64 and Doom 64 pending until those facts are verified. A project name,
search result, popularity, or unsigned external list is not enough.

Use this audit to guide future signed manifest publication. Do not add an entry to
an active catalog by editing audit status alone. Preserve original-site attribution,
exact bytes/hashes, rights boundaries and Authority signatures.
