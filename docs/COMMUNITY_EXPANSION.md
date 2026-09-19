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

### Follow-up: upstream updates and D-pad edition

Checked 2026-09-18 against upstream GitLab branch API. GitHub's mirror is stale:

| Source | Latest checked commit | Date | Change |
| --- | --- | --- | --- |
| GitLab `mods/performance` | `eb70fbabcaa671757b51bc931679a1f09b4ad724` | 2026-05-28 | Fix issue with terminating BG scripts |
| Previous GitLab commit | `150aa232586c3b55c8adac3aa3530355c947cf45` | 2025-07-14 | Fix undefined behavior in `amgr_create` |
| GitHub mirror | `c5f87b4c907cc11d078d84cc2d7aa7a271bf8a66` | 2024-11-16 UTC | Fix some `require_object_collected` objectives |

Evidence endpoints:

- https://gitlab.com/api/v4/projects/RyanDwyer%2Fperfect-dark/repository/branches/mods%2Fperformance
- https://gitlab.com/api/v4/projects/RyanDwyer%2Fperfect-dark/repository/commits?ref_name=mods%2Fperformance&per_page=10
- https://api.github.com/repos/n64decomp/perfect_dark/commits/mods/performance

[CasualSeth's D-pad restoration announcement](https://retrogametalk.com/threads/perfect-dark-high-performance-d-pad-restoration.19337/)
is dated January 15, 2026. It restores D-pad controls and disables the performance
graph. A February reply reports D-pad menu navigation still does not work; that
report has not been independently verified. The linked Internet Archive metadata
at https://archive.org/metadata/pdhp_dpad lists `pdhp_dpad.z64`, not a patch.
Only metadata was inspected; that ROM was not downloaded or cataloged.

Upstream GitLab releases remain empty. No attributable, client-supported patch
for the May 2026 source revision was located in this pass. Compilation from the
pinned upstream source and a separately identified patch release would be a
distinct follow-up, not evidence that an existing downloadable patch is current.

### Supplied PDHP download and DKR 1.1

The user supplied `https://files.catbox.moe/7vit86.zip`, associated with the
GitHub performance branch. Its only member, `pd-perf.xdelta`, now reproduces
successfully twice through Bitcadia64 against Perfect Dark USA Rev 1, and ZIP
extraction passes the client extractor. Added as **unversioned**, under a
separate Perfect Dark decompilation source catalog. The archive does not establish
which upstream commit produced it; this is not advertised as the May 2026 update.
Total publication candidate: 1,642 entries.

The user also requested [DKR Performance Patch 1.1](https://github.com/FazanaJ/Diddy-Kong-Racing/releases/tag/1.1).
The original asset was downloaded and hashed. It is IPS, and the release requires
the initial USA ROM, explicitly not Rev A. Local inventory contains USA Rev 1.
It remains pending both IPS support and a matching base; no output identity was
invented. Exact download evidence is in `sources/performance-mod-verification.json`.

### RAR/IPS client follow-up

Updated client now supports bounded, non-solid RAR 2/3/4 extraction and IPS.
Amped Up 3.21 was extracted from the original GameBanana RAR and applied on both
Linux and Windows, producing the previously pinned output hash. It is added as
a separate GameBanana record; 3.00 mirror remains available. Candidate total is
1,643 entries. Deploy the RAR-capable client before publishing this candidate.

DKR 1.1 is no longer blocked by patch format in the updated client. It still
requires the absent original-USA base, so no installable record is admitted yet.

### Sequence 9 admission

The user supplied a local original-USA DKR ROM whose SHA-1 exactly matches
FazanaJ's documented `0cb115d8716dbbc2922fda38e533b9fe63bb9670` base requirement,
as recorded in verification JSON and the upstream README.
Two native Windows client IPS runs and an independent
IPS interpreter produced byte-identical output. DKR 1.1 is now admitted under
FazanaJ, alongside PDHP and Amped Up 3.21. Sequence 9 contains 1,644 entries and
eleven source catalogs. Earlier blocker paragraphs above describe audit history.
