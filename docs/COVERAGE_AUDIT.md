# N64 coverage audit

`sources/n64-coverage-audit-v1.json` is planning data. It does not authorize
downloads, catalog activation, trust, or redistribution. It records known signed
Authority source coverage and projects that still need artifact review.

Run validator from Authority repository root:

```console
node tools/validate-coverage-audit.mjs
```

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
