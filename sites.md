# Bitcadia/Authority site list (live, 2026-08-28)

Original sites are the patch locators. This repo signs an index; it does not host ROMs or redistribute patches.

## Default gossiper locator (no redirects)

- Manifest: `https://raw.githubusercontent.com/Bitcadia/Authority/main/authority-manifest-v2.json`
- Catalog objects: `https://raw.githubusercontent.com/Bitcadia/Authority/main/catalog/`
- GitHub Release copies of the same files are backups only. `releases/latest/download` 302s and the importer rejects redirects.

## MAIN (ingest when machine-readable patches exist)

| id | name | homepage | listing | format notes |
|---|---|---|---|---|
| smash-remix | Smash Remix | https://smashremix.net | https://smashremix.net/patcher/patches/releases.json | **xdelta**, public JSON, NTSC in signed catalog (seq 1+2). |
| sm64romhacks | SM64 Romhacks | https://sm64romhacks.com | https://sm64romhacks.com/api/v1/hacks | BPS in ZIP; 9 USA entries in signed catalog (seq 2). |
| rhdc | Romhacking.com | https://romhacking.com | https://api.romhacking.com/v4/hacks | SM64 BPS; metadata backup and separate per-base sister catalog staged. Historical seq 2 contains 6 entries. |
| hylian-modding | Hylian Modding | https://hylianmodding.com | https://hylianmodding.com/mods | OoT/MM. 15 BPS in signed catalog (14 OoT USA, 1 MM USA Pumkin Tower). |
| romhackplaza | Romhack Plaza | https://romhackplaza.org | https://romhackplaza.org/database | Mixed xdelta/BPS; JSON needs API key. |

## BACKUP / TITLE

| id | role | notes |
|---|---|---|
| github-smashremix | TITLE companion | GitHub zip 302s — not a primary locator. |
| rhdn | BACKUP news | Cloudflare; files parked. |
| romhack-ing | BACKUP | Consumer API not for public apps. |
| gamebanana-sm64 | BACKUP | Public API; filter to N64 patches. |

## Not production

In-repo `tools/library-importer/src/testdata/registry-v1.json` is a fixture only. Do not publish it.
