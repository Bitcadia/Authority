# Recommended N64 hack coverage

Audit date: 2026-09-18. This audit combines three published lists rather than
claiming an objective top 30:

- [FandomSpot: Top 15 N64 ROM hacks](https://www.fandomspot.com/best-n64-rom-hacks/)
- [Retro Dodo: 18 N64 ROM hacks](https://retrododo.com/best-n64-rom-hacks/)
- [FandomSpot: 10 Super Mario 64 ROM hacks](https://www.fandomspot.com/best-sm64-rom-hacks/)

Their union contains **33 projects**. `sources/top-n64-coverage.json` records
each original rank, exact catalog references, source links, and unresolved gaps.
Sixteen projects already had source entries; seven gain entries here. Ten remain
blocked. A source entry does not establish gameplay or console compatibility.
Names in articles sometimes differ from source titles. Identity notes cover
Kirby Edition, Super Falcon 64, and Four Swords; article gameplay claims are not
treated as verified facts.

## Added releases

Ten records are added, taking the generated publication from 1625 to 1635:

| Project | Version | Source |
| --- | --- | --- |
| GoldenEye X | 6a | N64 Vault |
| Super Mario 64: The Missing Stars | 2.0 Console Compatible | SM64 Romhacks |
| Super Donkey Kong 64 | 1.0 | SM64 Romhacks |
| Super Kirby 64 | 1.0 | SM64 Romhacks |
| Super Captain Falcon 64 | 1.3, vanilla and uncompressed | SM64 Romhacks |
| Star Revenge 1.5: Star Takeover Redone | 2.2.1 | SM64 Romhacks |
| Super Mario Bros. 64 | 1.0 Fixed | SM64 Romhacks |
| Mario Kart 64: 4 Player Grand Prix | 1.0 | GameBanana |
| Mario Kart 64: Amped Up | 3.00 | Patcher64Plus community mirror |

The GameBanana release and requested Amped Up release are additional coverage
outside the three lists.
GoldenEye: Peach's Castle was also downloaded and reproduced, then matched to
the existing archived RHDN record; it is not counted as a new entry.

Each added patch was applied twice with Bitcadia64's BPS/VCDIFF implementation.
ZIP members were also checked with the client's extractor. Original archive,
member, base, and output hashes are recorded in `sources/top-n64-verification.json`
and `sources/amped-up-verification.json`.
Resolved HTTPS downloads were fetched again and matched before adding entries.
No ROM or patch bytes are stored in this repository. Save types remain explicit;
GoldenEye X uses Perfect Dark USA Rev 1 with EEPROM 16k.

## Remaining gaps

| Project | Verified blocker |
| --- | --- |
| JFG Trainer and Co-Op | Archived trainer is packaged as 7z; unsupported client distribution |
| Pokemon Stadium Kaizo | Both BPS patches reject available local bases; matching USA revision needed |
| 40 Winks Crack | IPS patch unsupported by client |
| F-Zero DXP | 7z package unsupported by client |
| F-Zero X Climax | USA/Japan IPS patches unsupported by client |
| The Jiggies of Time | Public patcher requires Banjo-Kazooie v1.0; local copy is Rev 1 |
| Voyager of Time | Readme requires Europe Debug GameCube base, absent locally |
| Gruntilda's Mask | Creator's collection download requires membership; no verified public patch acquired |
| Banjo-Kazooie: Stay At Home | Same collection access blocker |
| Waluigi of Time | Main and voice patches use unsupported PPF format |

Voyager's required base SHA-1 is `CEE6BC3C2A634B41728F2AF8DA54D9BF8CC14099`.
Jiggies' documented USA v1.0 base SHA-1 is
`1FE1632098865F639E22C11B9A81EE8F29C75D7A`.
Missing base ROMs were not downloaded. Unsupported patches were not repackaged
or silently converted into apparently original artifacts.

## GameBanana and authority scope

GameBanana's public API exposes useful N64 projects, file IDs, author credits,
and download links. The F-Zero X feed (game 5749) and four pages of Mario Kart 64
(game 6558) were inspected. This is a source sample, not a complete site crawl.

- [4 Player Grand Prix](https://gamebanana.com/mods/378082) provides a supported
  BPS-in-ZIP release, now verified.
- [Amped Up 3.21](https://gamebanana.com/mods/613207) is distributed as RAR.
  Its BPS member was extracted with `node-unrar-js` and reproduced twice with
  Bitcadia64. The client cannot extract that original container yet. Version
  3.00 is available as a direct, commit-pinned BPS from the attributed
  Patcher64Plus community mirror and is included as an older release.
  The public Patcharobi page offers up to 3.02 through a POST-based browser
  patcher, not a stable direct patch URL. See `sources/amped-up-verification.json`.
  Amped Up requires Expansion Pak / 8 MiB memory and EEPROM 16k according to
  the author. The 3.21 bundled Project64 MD5 differs from the actual BPS output;
  both values are retained in evidence. No gameplay compatibility is asserted.
- [Pokemon Kart 1.2](https://gamebanana.com/mods/604826) is distributed as 7z.
- [Mute City - Nostalgia](https://gamebanana.com/mods/474410) contains an FZEP
  track file requiring F-Zero Execution Project, not a supported ROM patch.
- [F-Zero ZX Overdrive](https://gamebanana.com/mods/313150) and
  [GX Demake Overdrive](https://gamebanana.com/mods/499581) use RAR packages.

N64 Vault and GameBanana entries use the existing root curator in
`sources/community-registry.json`. SM64 entries use the existing SM64 sister.
No new signing key or peer trust is necessary merely to index another host.

## Publication

These are editable source additions, not a deployed signed publication.
Sequence 8 signing run `35289399823` was waiting for approval during this audit.
Publish these changes with a later sequence and the correct previous payload
hashes after the current publication completes. Do not reuse sequence 8 for
changed catalog bytes.

Checks:

```sh
node --test test/*.test.mjs
node tools/build-publication.mjs . NEW_OUTPUT_DIRECTORY
node tools/validate-publication.mjs . NEW_OUTPUT_DIRECTORY
node tools/check-client-catalogs.mjs CLIENT_HELPER NEW_OUTPUT_DIRECTORY
```
