# Bitcadia Authority

Signed backup catalog for Bitcadia64. Original mod sites remain the patch download
sources. This repository distributes neither ROM dumps nor patch bytes.

## Player endpoint

https://bitcadia.github.io/Authority/authority-manifest.json

The endpoint returns JSON directly. Bitcadia64 rejects redirects. Sequence 6
contains 1,613 entries across RHDC, Hylian Modding, SM64 Romhacks, Smash Remix,
Romhack Plaza, and archived RHDN releases. Authority identity and signature
domain remain unchanged.

Plaza adds 21 reproducibly applied variants from 14 projects. Eight legacy RHDC
entries are excluded for unavailable downloads or output sizes beyond the current
client limit. See [Plaza audit](docs/PLAZA.md).

RHDN's September 2021 backup supplies 45 source records across 12 games, including
14 restored records that share outputs with another source or patch encoding.
See [backup audit](docs/RHDN_BACKUP.md) for hashes, exclusions, and provenance.

## Editable JSON

`sources/` contains one current registry per provider, canonical picks, publication
settings, coverage planning, and audit evidence needed to refresh entries.
Source filenames are stable; Git records their history. Schemas retain protocol
version names because existing documents reference those schema URLs.

Generated manifests, decoded payload copies, hash-named catalogs, obsolete
registries, and captured upstream snapshots are not committed. Earlier copies
remain in Git history. Capture tools write snapshots under ignored `scratch/`;
create that directory before running a capture. Review resulting registry changes
and pinned artifact/output identities before publication.

## Validate and build

```sh
node --test test/*.test.mjs
python3 test/devops-hook.test.py
node tools/validate-coverage-audit.mjs
node tools/build-publication.mjs . dist
node tools/validate-publication.mjs . dist
```

Use a fresh output directory for each build. Apply `run-ci` to a PR to run checks
and upload the complete preview artifact. Remove/re-add the label after updates.
PR previews contain unsigned payloads; signing tests use temporary keys.

## Publish

The manual **Publish Authority** workflow builds unsigned JSON on hosted GitHub
CI, triggers DevOps signing on omcadia using Publishing Key Vault, verifies the
returned signatures, and deploys the generated artifact to GitHub Pages.

See [publication process](docs/PUBLICATION.md),
[DevOps signing](deploy/omcadia/DEVOPS.md), and
[coverage audit](docs/COVERAGE_AUDIT.md).

The old raw GitHub endpoint is removed by this cleanup. Deploy the Bitcadia64
Pages migration before merging; older clients must update or configure the Pages
locator. Git history is an archive, not a live client endpoint.
