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

The current four registries contain 1,555 verified entries. The README's older
1,568-entry total describes the publication before 13 RHDC entries were excluded.

## Preview build

```sh
node --test test/*.test.mjs
node tools/build-publication.mjs . dist
node tools/validate-publication.mjs . dist
```

Use a new output directory for each build. The builder refuses to overwrite an
existing directory. All inputs, including issue and expiry dates, are fixed in
source, so repeated builds produce the same bytes.

Applying `run-ci` to a PR runs the tests, validates the existing signed publication,
builds a preview, validates its JSON references, and uploads `authority-preview-*`.
Preview artifacts contain catalogs and unsigned payloads. They are not trusted
publications. Unit tests exercise signing and signature rejection with temporary
keys; production keys are not available to PR jobs.

## Signed Pages deployment

Pages is configured for Actions at `https://bitcadia.github.io/Authority/`.
The root locator will be `https://bitcadia.github.io/Authority/authority-manifest.json`.

1. Configure the restricted omcadia runner and environment as described in
   `deploy/omcadia/README.md`. Keys remain on omcadia.
2. Install the four existing private keys on omcadia. The signer checks each key
   against the public identity installed in its image. No keys enter GitHub.
3. Review `sources/publication.json`. For each new publication, increase sequence,
   set dates, and set previous hashes to SHA-256 of the last deployed payload bytes.
4. Run **Publish Authority** from `main`. Hosted CI builds unsigned JSON; omcadia
   validates and signs it using a local tool and persistent sequence state.
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

Until Pages is signed and verified, the old live JSON remains in Git. GitHub
Actions artifacts expire and are not the player download endpoint; Pages serves
the deployed publication independently of artifact retention.
