# N64 Vault page artwork

Ten previously unillustrated releases now reference their own N64 Vault page
images. Page screenshots and collages are accepted as default covers for these
entries, as requested. Images remain on the original host, with exact size and
SHA-256 pins and the mod page as `sourcePage`.

| Release | Page image | Dimensions |
| --- | --- | --- |
| The Janus Alternative | Campaign emblem/menu | 632×479 |
| K7 Assignment | Campaign emblem/menu | 632×479 |
| GoldenEye with Mario Characters | Promotional title image | 660×350 |
| Smash 64 - Bomberman Stages | Gameplay collage | 1151×845 |
| Three Stage Mod | Stage-selection collage | 1600×900 |
| Ganon's Ruin Stage | Gameplay screenshot | 2293×1682 |
| Houston Triple Pack Stage | Stage-selection collage | 610×442 |
| DK World-Gex Scream TV Stage | Logos/gameplay collage | 549×409 |
| Wizard Quad Pack | Gameplay collage | 600×476 |
| Smash 64 - Cartman | Character gameplay screenshot | 640×480 |

All ten images were visually inspected. Patch/output pins, source attribution,
and redistribution flags are unchanged. The existing four N64 Vault images,
including Goldfinger's selected Fandom front cover, are retained.

## Verification

All ten additions passed the native Windows client's
`registry.downloadArtworkScoped` size/SHA-256 checks and artwork decoder on
2026-09-19. Tests used a separate Windows TEMP cache. Ganon's Ruin and Wizard
Quad Pack initially returned `DownloadFailed`; both succeeded after the normal
retry backoff expired. The host can return intermittent errors.

The unsigned preview contains 1,662 entries. All 34 Authority tests passed,
publication validation passed, and the client parser accepted all 43 generated
catalog documents. Full browser-card rendering was not exercised in this audit.

These additions require a new signed publication after sequence 10.
