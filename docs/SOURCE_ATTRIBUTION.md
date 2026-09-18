# Source catalogs and Bitcadia discovery

Bitcadia's root manifest is a discovery and backup statement. It has no owned
`registry`. Its peers name the sites from which entries were captured. Bitcadia
hosts the backup JSON and signs its attestation; that does not imply the source
site operates the signing key or endorses this mirror.

## Audit of all 1,641 published-candidate entries

| Displayed source | Entries | Backup signing arrangement |
| --- | ---: | --- |
| Romhacking.com | 1,511 | Direct peer claim in root manifest |
| Romhack Plaza | 21 | Direct peer claim in root manifest |
| Romhacking.net (archive) | 57 | Direct peer claim in root manifest |
| GameBanana | 3 | Direct peer claim in root manifest |
| N64 Vault | 4 | Direct peer claim in root manifest |
| Patcher64Plus (mirror) | 2 | Direct peer claim in root manifest |
| Smash Remix | 1 | Existing Bitcadia-operated sister manifest |
| Hylian Modding | 26 | Existing Bitcadia-operated sister manifest |
| SM64 Romhacks | 16 | Existing Bitcadia-operated sister manifest |

The audit found six RHDC records in the SM64 source file. Publication now routes
them to Romhacking.com, retaining their IDs, URLs, and hashes. The eight excluded
RHDC records remain excluded. No release records are removed or merged merely
because two sources share output bytes.

`sources/catalog-sources.json` defines the routing by input file and exact
provider. Every input record must be assigned once; unknown providers fail the
build. Publication validation checks each entry against its source policy.
Tests verify names, all source counts, no duplicate IDs, and rejection of root
ownership or mislabeling.

Display names describe the metadata source, not necessarily the patch author or
artifact host. Examples:

- An archived RHDN record remains Romhacking.net, although Internet Archive
  serves its ZIP.
- Amped Up's 3.00 record remains Patcher64Plus (mirror), with Litronom in its
  author field and GameBanana as its project page.
- GoldenEye X remains N64 Vault, with Wreck and collaborators as authors.

## Identities and migration

There are nine source catalogs and four existing signing identities. New
separately named backup catalogs do not require inventing publisher identities.
The root attests to six direct peer registries; the existing three sister
manifests keep their keys, paths, and signed history. The internal root signing
ID `rhdc` is retained for signer-state compatibility; it is not catalog ownership.
The UI receives each peer's source display name, while attester metadata still
identifies Bitcadia's signature honestly.

When a source operator publishes its own manifest, verify its identity and
history, then configure that primary manifest and signed backup locators. Do not
claim a Bitcadia-generated key belongs to that operator. Moving to an independent
identity needs an explicit trust migration, not a silent key swap.

## Rollout requirements

1. Deploy the updated signer image/policy before publishing this layout.
   `validate-publication.mjs` and `sources/catalog-sources.json` must be present
   in the pinned signer image. The signer uses its own policy, never artifact code.
2. Advance `sources/publication.json` from the latest deployed signed heads.
   Existing sequence 8 cannot be reused for changed bytes.
3. Build, sign, verify retained history, and deploy Pages through the normal flow.
4. Verify the root has no registry and its nine peers have the names above.
5. Refresh the client. Source-scoped confirmations/cache keys can change when
   mixed catalogs split; do not carry old installation grants across new scopes.

No Key Vault secret, service principal permission, signing identity, or protocol
schema addition is needed for this source split.
