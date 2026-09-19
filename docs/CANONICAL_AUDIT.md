# Canonical mod audit

`sources/canonical-audit.json` covers all 14 base games with catalog entries,
including base revisions, selected source-scoped entry IDs, reasons, caveats,
evidence URLs, and explicit unfilled slots. Curation is maintained by Bitcadia
for these backup catalogs; it does not assert publisher endorsement.

## The Preserver

The new fifth slot is `the-preserver`: original-game bug/performance fixes that
other mod authors should consider as a foundation. It does not authorize
stacking existing retail patches onto changed bytes. A derived recipe must bind
the exact Preserver output, or its author must rebase source changes.

| Game | Preserver candidate | Caveat |
| --- | --- | --- |
| Diddy Kong Racing | Performance Patch 1.1 | Original USA only; rebuilt layout requires explicit dependencies |
| Perfect Dark | High Performance | Provisional: supplied build's source commit unknown; Expansion Pak and debug/control changes |
| Space Station Silicon Valley | Bug Fixes 1.2 | USA Rev 1 only; review exact bundled fixes before using as foundation |

No suitable Preserver was selected for the other eleven games. Redux remains a
Replacement candidate rather than being advertised as a minimal bug-fix base.

## Other recommendations

- GoldenEye: **Goldfinger** as Sequel, **Tomorrow Never Dies Expanded** as DLC,
  **Mario Characters** as Experiment. No neutral Replacement/Preserver forced.
- Mario Kart: **Amped Up 3.21** as Sequel, **4 Player Grand Prix** as DLC,
  **Hooting Time 1.44** as Replacement, **Battle Kart 2.0** as Experiment.
- Perfect Dark: **Dark Noon** as DLC (first-level release), **GoldenEye X** as
  Experiment (crossover with incomplete campaign).
- F-Zero X: **Climax 1.1** as Sequel.
- Doom 64: **Merciless Edition** as Experiment, not preservation.
- Duke Nukem Zero Hour: **Uncut** as Replacement/content restoration.
- Pokemon Stadium 2: **Mord's Moveset** as Experiment.
- Smash: retain **Smash Remix** Replacement; **Bomberman stages** DLC and
  **Cartman** Experiment under N64 Vault.
- Zelda: retain existing Hylian recommendations; add source-scoped **Redux**
  Replacement alternatives under Plaza.
- SM64: retain Decades Later, Wario's Hint Art, Star Road, and BAZR. No known
  retail-preserving performance base was verified in this pass.
- DK64: leave slots empty rather than endorse KongQuest without a sufficient
  role/quality audit.

There are 32 source-scoped picks. Multiple sources may recommend different
entries in the same slot; those remain distinct curator claims. Artwork and
patch verification are not gameplay certification.

## Rollout

Updated client, authoring, federation/dispute handling, and validators must ship
before these picks are signed. Older clients reject `the-preserver` as unknown.
Use a new publication sequence after live sequence 9. This checkout also contains
pending EverDrive additions and artwork changes. Goldfinger's formerly blocked
LaunchBox cover now uses a Fandom CDN URL verified through the Windows client.
