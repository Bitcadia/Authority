# Bitcadia Authority

Signed default catalog for [Bitcadia64](https://github.com/Bitcadia). This repo is a **backup index**. Original mod sites remain the patch download sources. No ROM dumps. Patches are not redistributed here.

## Live locator (use this in the app)

`https://raw.githubusercontent.com/Bitcadia/Authority/main/authority-manifest-v2.json`

Do **not** point the importer at GitHub `releases/latest/download`. Those URLs 302, and Bitcadia64 rejects redirects (`allowRedirects: false`). Release assets are backups of the same files.

Catalog objects live under [`catalog/`](catalog/).

The current publication candidate is sequence 11. It pins Hylian Modding
authority sequence 5 and artwork for all 25 Hylian entries, including original
WebP sources and the corrected Star Fox 64 Survival image path. Sequence 10
remains live until this manifest is merged and released.

## Sequence 11 (2026-08-31)

| Field | Value |
|---|---|
| Authority | Bitcadia Authority |
| Sequence | 11 |
| Hylian authority | Sequence 5, 25 entries; all with pinned artwork |
| Canonical OoT picks | Dawn and Dusk (Sequel), The Missing Link (DLC), New Master Quest (Replacement), Hero of Law (Experiment) |

## Sequence 10 (2026-08-31)

| Field | Value |
|---|---|
| Authority | Bitcadia Authority |
| Sequence | 10 |
| Hylian authority | Sequence 4, 25 entries; 17 with pinned artwork |
| Canonical OoT picks | Dawn and Dusk (Sequel), The Missing Link (DLC), New Master Quest (Replacement), Hero of Law (Experiment) |

## Sequence 9 (2026-08-31)

| Field | Value |
|---|---|
| Authority | Bitcadia Authority |
| authorityId | `ed25519:Df--2beY1D0DvraD-y2kGO5m3P6jC1DAOqUIhLkT6ZE` |
| Sequence | 9 |
| Hylian authority | Sequence 3, 25 publishable entries from 46 indexed records; 17 with pinned artwork |
| Canonical OoT picks | Dawn and Dusk, New Master Quest, Hero of Law |
| Direct registry | RHDC, 1,526 Super Mario 64 USA BPS entries; 1,524 with pinned artwork |
| Other sister registries | Smash Remix, SM64 Romhacks |

## Sequence 8 (2026-08-31)

| Field | Value |
|---|---|
| Authority | Bitcadia Authority |
| authorityId | `ed25519:Df--2beY1D0DvraD-y2kGO5m3P6jC1DAOqUIhLkT6ZE` |
| Sequence | 8 |
| Hylian authority | Sequence 2, 15 BPS entries; 11 with pinned artwork |
| Direct registry | RHDC, 1,526 Super Mario 64 USA BPS entries; 1,524 with pinned artwork |
| Other sister registries | Smash Remix, SM64 Romhacks |

The root claim uses the immutable Hylian sequence-2 backup. A future root
publication can restore the Hylian Modding site as the primary locator after it
serves a valid signed manifest instead of its current HTML response.

## Sequence 7 (2026-08-30)

| Field | Value |
|---|---|
| Authority | Bitcadia Authority |
| authorityId | `ed25519:Df--2beY1D0DvraD-y2kGO5m3P6jC1DAOqUIhLkT6ZE` |
| Sequence | 7 |
| Direct registry | RHDC, 1,526 Super Mario 64 USA BPS entries; 1,524 with pinned artwork |
| Updated sister registry | Hylian Modding, 15 BPS entries; 11 with pinned artwork |
| Other sister registries | Smash Remix, SM64 Romhacks |

Sequence 7 directly attested the Hylian artwork registry while retaining Hylian
sequence 1 as its identity pin. Sequence 8 supersedes it with the matching Hylian
sequence-2 publication.

## Sequence 6 (2026-08-29)

| Field | Value |
|---|---|
| Authority | Bitcadia Authority |
| authorityId | `ed25519:Df--2beY1D0DvraD-y2kGO5m3P6jC1DAOqUIhLkT6ZE` |
| Sequence | 6 |
| Direct registry | RHDC, 1,526 Super Mario 64 USA BPS entries; 1,524 with pinned artwork |
| Sister registries | Smash Remix, Hylian Modding, SM64 Romhacks |

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
| rhdc | [Romhacking.com](https://romhacking.com) | MAIN | SM64 BPS; 1,526 entries in signed catalog (direct BPS). |
| hylian-modding | [Hylian Modding](https://hylianmodding.com) | MAIN | OoT/MM; current signed publication has 15 entries, with a 25-entry expansion staged. |
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

Run `node tools/pin-rhdc-artwork.mjs` after capture to fetch the first valid
source screenshot for each generated direct-BPS entry and record its exact URL,
size, SHA-256, and source page in `sources/rhdc-artwork-pins-v1.json`. Redirects,
non-image bytes, and images larger than 8 MiB are rejected; unavailable entries
remain listed under `skipped` and use the importer's generated artwork fallback.

Run `node tools/generate-rhdc-registry.mjs` after pinning artwork to generate
`sources/rhdc-bps-registry-v1.json`. The generated registry selects each hack's
latest approved, non-archived direct BPS release. It preserves upstream output
SHA-1 values while omitting patch size and SHA-256 when RHDC does not provide
them, and adds pinned original-site artwork when available. ZIP releases remain
only in the raw snapshot because RHDC does not identify one archive member for
safe extraction.

Run `node tools/pin-hylian-artwork.mjs` to fetch each Hylian entry's
`thumbnail_image` from its original `mod.json` and record the exact same-origin
URL, size, SHA-256, and source page in
`sources/hylian-artwork-pins-v1.json`. Then run
`node tools/apply-hylian-artwork.mjs` to add those pins to the Hylian source
registry before rebuilding `sites/hylian/catalog/`. Images remain on Hylian
Modding and `artworkRedistributionAllowed` remains false. The generated objects
are currently activated by Hylian authority sequence 2 and root Authority
sequence 8. Expanded generated objects remain staged until newer signed
Hylian and root Authority sequences pin their content-addressed index.

Run `node tools/capture-hylian-registry.mjs` to capture the complete current
inventory from `https://hylianmodding.com/mods/index.json` and each listed
`mod.json`. Run `node tools/audit-hylian-artifacts.mjs` to pin direct BPS files,
safe ZIPs with one exact supported BPS member, and explicit publisher overrides.
The audit records unsupported, ambiguous, or wrong-base releases under `pending`
instead of guessing. `node tools/generate-hylian-registry.mjs` then builds the
publishable source registry from those exact artifact pins before artwork and
content-addressed catalog generation.

Run `node tools/build-base-rom-catalog.mjs` to split that source by normalized
base-ROM SHA-256 and generate content-addressed list and index objects under
`sites/rhdc/catalog/`. RHDC currently yields one list for Super Mario 64 USA.
Provider identity remains a sister-authority boundary; base ROM identity remains
the list boundary, so different authorities may legitimately index the same base.
Run `node tools/validate-base-rom-catalog.mjs sites/rhdc/catalog` to verify exact
object hashes, unique index bases, and every list/index base-ROM relationship.
The RHDC objects are directly attested by the root Authority publication;
historical signed objects remain immutable.

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
