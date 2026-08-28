# Bitcadia Authority

Signed default catalog for [Bitcadia64](https://github.com/Bitcadia). This repo is a **backup index**. Original mod sites remain the patch download sources. No ROM dumps. Patches are not redistributed here.

## Live locator (use this in the app)

`https://raw.githubusercontent.com/Bitcadia/Authority/main/authority-manifest-v2.json`

Do **not** point the importer at GitHub `releases/latest/download`. Those URLs 302, and Bitcadia64 rejects redirects (`allowRedirects: false`). Release assets are backups of the same files.

Catalog objects live under [`catalog/`](catalog/).

The current publication candidate is sequence 5. It adds the RHDC per-base index
as a direct registry claim while retaining the independently signed Smash Remix,
Hylian Modding, and SM64 Romhacks sister authorities. Sequence 4 remains live
until the signed manifest is merged and released.

## Sequence 5 (2026-08-28)

| Field | Value |
|---|---|
| Authority | Bitcadia Authority |
| authorityId | `ed25519:Df--2beY1D0DvraD-y2kGO5m3P6jC1DAOqUIhLkT6ZE` |
| Sequence | 5 |
| Direct registry | RHDC, 1,526 Super Mario 64 USA BPS entries |
| Sister registries | Smash Remix, Hylian Modding, SM64 Romhacks |

The direct RHDC claim points to the content-addressed index under
`sites/rhdc/catalog/`. The Sokol app still loads the signed Authority manifest;
it does not crawl the RHDC v4 metadata API at runtime.

## Sequence 2 (2026-08-28)

| Field | Value |
|---|---|
| Authority | Bitcadia Authority |
| authorityId | `ed25519:Df--2beY1D0DvraD-y2kGO5m3P6jC1DAOqUIhLkT6ZE` |
| Issued | 2026-08-28T02:23:39Z |
| Expires | 2036-08-25T02:23:39Z |
| Sequence | 2 |
| Entries | 31 (1 Smash Remix + 15 Hylian BPS + 15 SM64 BPS) |
| Games | Super Smash Bros. USA, OoT USA, Majora's Mask USA, Super Mario 64 USA |

Live index of original-site URLs only. Smash Remix 2.0.1 NTSC xdelta from [smashremix.net](https://smashremix.net/patcher/). 14 OoT + 1 MM BPS from [Hylian Modding](https://hylianmodding.com). 15 SM64 USA BPS from [Romhacking.com](https://romhacking.com) (6) and [SM64 Romhacks](https://sm64romhacks.com) (9, zip+archiveMember). Base ROMs identified only by No-Intro hashes.

## Sequence 1 (2026-08-28)

| Field | Value |
|---|---|
| Authority | Bitcadia Authority |
| authorityId | `ed25519:Df--2beY1D0DvraD-y2kGO5m3P6jC1DAOqUIhLkT6ZE` |
| Issued | 2026-08-28T00:11:14Z |
| Expires | 2036-08-25T00:11:14Z |

First live entry: **Smash Remix 2.0.1 NTSC** xdelta from [smashremix.net](https://smashremix.net/patcher/) (`https://smashremix.net/patcher/patches/releases/smashremix2.0.1.xdelta`). Base ROM is identified only by No-Intro USA hashes (CRC32 `EB97929E`).

## Site roles

Original sites are **MAIN**. This GitHub repo and its Releases are **BACKUP**.

| id | name | role | notes |
|---|---|---|---|
| smash-remix | [Smash Remix](https://smashremix.net) | MAIN | Public xdelta index: `/patcher/patches/releases.json`. In signed catalog. |
| sm64romhacks | [SM64 Romhacks](https://sm64romhacks.com) | MAIN | SM64 BPS zips; 9 entries in signed catalog (zip+archiveMember). |
| rhdc | [Romhacking.com](https://romhacking.com) | MAIN | SM64 BPS; 6 entries in signed catalog (direct BPS). |
| hylian-modding | [Hylian Modding](https://hylianmodding.com) | MAIN | OoT/MM; 15 BPS in signed catalog (14 OoT USA, 1 MM USA). |
| romhackplaza | [Romhack Plaza](https://romhackplaza.org) | MAIN | Mixed formats; JSON needs an API key |
| rhdn | [ROMhacking.net](https://www.romhacking.net) | BACKUP | News; files parked |
| romhack-ing | [Romhack.ing](https://romhack.ing) | BACKUP | Successor UI; consumer API not for public apps |
| gamebanana-sm64 | [GameBanana SM64](https://gamebanana.com/games/5710) | BACKUP | Public API; filter to N64 patches |

In-app testdata registries are fixtures only and must not be published here.

## Backing up Romhacking.com registry metadata

Run `node tools/capture-rhdc-registry.mjs` to follow every cursor from both the
non-mature and mature partitions of the Romhacking.com v4 hacks endpoint and write
`sources/rhdc-v4-registry-snapshot.json`. The snapshot preserves all returned
hack and version metadata without applying maturity, approval, or privacy
filters. It never requests patch `directHref` URLs or stores patch bytes.

Run `node tools/generate-rhdc-registry.mjs` after capture to generate
`sources/rhdc-bps-registry-v1.json`. The generated registry selects each hack's
latest approved, non-archived direct BPS release. It preserves upstream output
SHA-1 values while omitting patch size and SHA-256 when RHDC does not provide
them. ZIP releases remain only in the raw snapshot because RHDC does not identify
one archive member for safe extraction.

Run `node tools/build-base-rom-catalog.mjs` to split that source by normalized
base-ROM SHA-256 and generate content-addressed list and index objects under
`sites/rhdc/catalog/`. RHDC currently yields one list for Super Mario 64 USA.
Provider identity remains a sister-authority boundary; base ROM identity remains
the list boundary, so different authorities may legitimately index the same base.
Run `node tools/validate-base-rom-catalog.mjs sites/rhdc/catalog` to verify exact
object hashes, unique index bases, and every list/index base-ROM relationship.
These RHDC objects are staged but unsigned; historical signed objects are not
modified, and activation requires a separate RHDC sister authority publication.

Canonical selections are keyed first by sister authority and then by normalized
base-ROM SHA-256 in `sources/canonical-picks-v1.json`. Resolved picks must
reference an entry in the same generated list. Named choices that are not yet
catalog entries remain under `pending` and are never emitted as dangling picks.
Selection metadata may distinguish a release flavor, such as vanilla Smash
Remix versus the separately released +EXTRA derivative; emitted pick metadata
still matches the immutable list entry exactly.

Use `node tools/curate-existing-index.mjs <index.json>` when adding picks to a
historical list. It verifies the existing list pins and writes a new index without
rewriting or duplicating the immutable list object.
