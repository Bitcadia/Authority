# Bitcadia Authority

Signed default catalog for [Bitcadia64](https://github.com/Bitcadia). This repo is a **backup index**. Original mod sites remain the patch download sources. No ROM dumps. Patches are not redistributed here.

## Live locator (use this in the app)

`https://raw.githubusercontent.com/Bitcadia/Authority/main/authority-manifest-v2.json`

Do **not** point the importer at GitHub `releases/latest/download`. Those URLs 302, and Bitcadia64 rejects redirects (`allowRedirects: false`). Release assets are backups of the same files.

Catalog objects live under [`catalog/`](catalog/).

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
| smash-remix | [Smash Remix](https://smashremix.net) | MAIN | Public xdelta index: `/patcher/patches/releases.json` |
| sm64romhacks | [SM64 Romhacks](https://sm64romhacks.com) | MAIN | SM64 BPS zips; not yet in the signed catalog |
| rhdc | [Romhacking.com](https://romhacking.com) | MAIN | SM64 BPS; per-hack API, no public list |
| hylian-modding | [Hylian Modding](https://hylianmodding.com) | MAIN | OoT/MM; zip/bps/7z, no xdelta CDN |
| romhackplaza | [Romhack Plaza](https://romhackplaza.org) | MAIN | Mixed formats; JSON needs an API key |
| rhdn | [ROMhacking.net](https://www.romhacking.net) | BACKUP | News; files parked |
| romhack-ing | [Romhack.ing](https://romhack.ing) | BACKUP | Successor UI; consumer API not for public apps |
| gamebanana-sm64 | [GameBanana SM64](https://gamebanana.com/games/5710) | BACKUP | Public API; filter to N64 patches |

In-app testdata registries are fixtures only and must not be published here.
