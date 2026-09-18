# Community source expansion

Audited 2026-09-18. Six additional releases bring source-publication coverage to
1,641 entries. Source routing remains governed by `catalog-sources.json`.

| Source | Addition | Version | Base |
| --- | --- | --- | --- |
| N64 Vault | Goldfinger 64 | 1.0 | GoldenEye 007 USA |
| N64 Vault | Tomorrow Never Dies 64 — Expanded | 11-24 | GoldenEye 007 USA |
| N64 Vault | Dark Noon | 2025-10-02 | Perfect Dark USA Rev 1 |
| GameBanana | Mario Kart 64 — Hooting Time | 1.44 offline | Mario Kart 64 USA |
| GameBanana | Mario Kart 64 Deluxe | 0.8.1 | Mario Kart 64 USA |
| Patcher64Plus community mirror | Battle Kart 64 | 2.0 | Mario Kart 64 USA |

Every patch was applied twice with Bitcadia64's BPS/VCDIFF code. Container,
member, base, and output SHA-256 values are retained in
`sources/community-expansion-verification.json`. ZIP members were also extracted
through the client's archive reader. GameBanana installers were not executed.
Five source screenshots are pinned and decoded with Windows System.Drawing;
that is not a claim of Sokol rendering or gameplay testing.

Smash Remix's official GitHub latest release remains 2.0.1, already covered.
Historical releases were not added solely to inflate that source's count.

Hooting Time includes four online player-specific patch variants. Those outputs
were investigated, but this console-focused batch includes only the offline
release. Mega Mushroom Blast remains blocked by its RAR distribution.
Battle Kart 2.0 is attributed to the Patcher64Plus mirror, not a new publisher.

Goldfinger and Tomorrow Never Dies require an Expansion Pak according to their
source pages. Goldfinger explicitly requires EEPROM 4k. Hooting Time's author
FAQ requires 8 MiB emulator memory. Save settings in metadata use EEPROM 4k for
GoldenEye/Mario Kart releases and EEPROM 16k for the Perfect Dark release.
Compatibility is recorded as patch-applied, not playtested.

Source download aliases on N64 Vault intermittently returned HTTP 500; verified
direct `n64vault.wdfiles.com` endpoints are pinned where available. Downloads
still remain dependent on their external hosts.

These entries require a new signed publication after the source-attribution
signer-policy update. They are not available in the live app until that deploys.

## Perfect Dark High Performance candidate

Identified [Perfect Dark — High Performance (PDHP)](https://gitlab.com/ryandwyer/perfect-dark/-/tree/mods/performance),
also mirrored at `n64decomp/perfect_dark`, branch `mods/performance`.
The author describes console optimizations, room/weapon preloading, and removal
of 4 MiB mode: an Expansion Pak is required. The README explicitly says accurate
benchmarking has not been done; no frame-rate improvement is asserted here.

The checked upstream GitLab and GitHub release lists expose no downloadable
release assets. This remains a source-code candidate, not an installable catalog
entry, until an attributable BPS/VCDIFF patch and exact base/output identity are
verified. `Bobbar/PDRepo_PDHP` is a fork pointing at that upstream branch, not the
original author. A D-pad-restoration edition also appears in search results and
must be treated separately if audited.
