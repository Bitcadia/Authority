# Generated publications

The target layout keeps editable sources in Git and builds complete publications
as CI artifacts. Git history records edits; source filenames do not include a
release number. Signed payloads still carry their protocol version, increasing
sequence, and previous-payload hash for client rollback protection.

## Source of truth

- `sources/{rhdc,hylian,sm64,smashremix}-registry.json`: verified catalog entries.
- `sources/canonical-picks.json`: curated selections.
- `sources/publication.json`: public endpoint, dates, sequence, previous hashes,
  and expected authority public-key identities.
- Coverage audit and active schemas remain source documents.
- `sources/catalog-sources.json`: source-attribution routing. The Bitcadia root
  is pointer-only; named source backup catalogs are direct peers or existing
  sister manifests. See `docs/SOURCE_ATTRIBUTION.md` for counts and rollout.

The current source split produces nine catalogs with 1,641 entries. Four existing
signing identities retain their history; catalog names identify source sites,
not the operator of Bitcadia's backup signing infrastructure.

## Preview build

```sh
node --test test/*.test.mjs
node tools/build-publication.mjs . dist
node tools/validate-publication.mjs . dist
```

Use a new output directory for each build. The builder refuses to overwrite an
existing directory. All inputs, including issue and expiry dates, are fixed in
source, so repeated builds produce the same bytes.

Applying `run-ci` to a PR runs the tests, builds a preview, validates its JSON
references, and uploads `authority-preview-*`.
Preview artifacts contain catalogs and unsigned payloads. They are not trusted
publications. Unit tests exercise signing and signature rejection with temporary
keys; production keys are not available to PR jobs.

## Signed Pages deployment

Pages is configured for Actions at `https://bitcadia.github.io/Authority/`.
The root locator will be `https://bitcadia.github.io/Authority/authority-manifest.json`.

1. Configure the dedicated DevOps signing pipeline as described in
   `deploy/omcadia/DEVOPS.md`.
2. Store the four PEM secrets in Publishing Key Vault. The DevOps workload
   identity reads only those secrets; signing checks pinned public identities.
3. Review `sources/publication.json`. For each new publication, increase sequence,
   set dates, and set previous hashes to SHA-256 of the last deployed payload bytes.
4. Run **Publish Authority** from `main`. Hosted CI builds unsigned JSON and
   triggers DevOps. Omcadia validates and signs it using Key Vault PEMs and persistent sequence state.
   Hosted CI verifies the returned signatures and deploys the artifact to Pages.
5. Verify the public URLs return JSON directly with HTTP 200, then validate the
   downloaded signed publication before migrating clients.

## Migration order

The existing `main/authority-manifest-v2.json` endpoint is still used by installed
Bitcadia64 clients. The transition therefore needs two releases:

1. Land the builder and deployment workflow, deploy signed Pages sequence 3, and
   update Bitcadia64's default and existing default-subscription migration.
2. Remove generated catalogs, manifest/payload copies, and obsolete capture
   snapshots from the source branch after the client transition. Update remaining
   audit tools to read the canonical registries and store capture/audit outputs
   outside Git. Retain any historical objects still needed by supported clients
   on the publication host, rather than in the source tree.

Pages sequence 3 has passed live signature/hash verification. This cleanup removes
the old live JSON from Git and depends on the Bitcadia64 Pages migration (DevOps
PR #469). Merge after the updated client is deployed. GitHub Actions artifacts
expire; Pages serves the deployed publication independently of artifact retention.
