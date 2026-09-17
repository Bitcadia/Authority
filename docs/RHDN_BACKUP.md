# RHDN September 2021 backup

Sequence 7 retains 57 verified source records across 12 games from the public
[RHDN 20210914 archive](https://archive.org/details/rhdn-20210914).
The user supplied the downloaded archive for local inspection. This is an older
release snapshot; entry versions and authors come from its `scraped_info.txt`,
not the current RHDN website.

## Audit results

- Found 113 N64 metadata records; 111 had recognizable hack/translation IDs.
- Reproduced 45 supported patch variants using local ROMs matched to archived
  base SHA-1 requirements.
- Sequence 5 excluded 14 records sharing outputs with existing entries or another
  patch encoding. Sequence 6 restores them: source records and download choices
  remain distinct even when output ROM bytes match.
- Recorded 113 pending cases (individual files, members, or projects), including
  unsupported IPS/PPF/7z/RAR, missing bases, and decoder failures.

`sources/rhdn-backup-verification.json` records the evidence and pending cases.
`sources/rhdn-registry.json` contains installable entries.

## Verification

The audit used Bitcadia64's BPS/VCDIFF implementations, compiled into a small
local driver. Each successful patch was applied twice from the same base ROM;
both resulting SHA-256 values agreed. The output had a big-endian N64 header.
The production ZIP extraction adapter also accepted each selected member and
matched its SHA-256.

For every successful download container, the individual ZIP retrieved from
Internet Archive matched the local backup's SHA-256. The catalog pins the resolved
`view_archive.php` HTTPS URL, which returned HTTP 200 without another redirect,
plus container size/hash, ZIP member path/size/hash, base identity, and output
size/hash. Clients download only the individual patch archive, not the 6.56 GB
backup. No ROMs, patches, or executable tools from the backup enter this repo.

Existing base metadata is reused where available. Newly introduced cartridge
save settings were checked against the Mupen64Plus ROM database:
`https://raw.githubusercontent.com/mupen64plus/mupen64plus-core/master/data/mupen64plus.ini`.
These are base-game save settings, not a gameplay test. `none` means no cartridge
save device; Doom 64 and Duke Nukem Zero Hour use Controller Pak saves.

All 20 generated catalog/index documents pass the current Bitcadia64 parsers.
Sequence 7 contains 1,625 total entries. Archive omissions remain pending and
do not block publication of the supported subset.

The audit's `duplicates` array is informational, not an exclusion list. Import
rejects repeated source IDs but retains different source records with equal
base/output hashes. Bitcadia64 release identity binds entry digest plus output
hash: different metadata remains distinct; identical entry/output pairs alias.
The client acceptance helper checks shared-output pairs with that exact function.

## Second archive pass

The archive listing at
`https://ia800803.us.archive.org/view_archive.php?archive=/24/items/rhdn-20210914/RHDN-20210914.zip`
is the same backup. A second pass recovered 12 BPS variants excluded by the
initial SHA-1-only matching and Old/Older directory filter:

- Doom 64: Merciless Edition for USA Rev 1.
- Amagami Mario Kart, big-endian USA patch.
- Four archived Majora's Mask Redux variants.
- Four archived Ocarina of Time / Master Quest Redux variants.
- Dawn & Dusk for USA Ocarina of Time revisions 1 and 2.

Base candidates were restricted to the named game, then matched to the BPS
source byte size and CRC32. Their full SHA-256 identities were computed locally;
both patch applications passed BPS source/patch/target checks and produced the
same output. This is recorded as `baseEvidence`, rather than claiming an archived
SHA-1 match. Public download archives were checked against backup bytes; ZIP
members were checked with the client extractor.

Archived subdirectory versions override the enclosing page version for those
members. Previous pending cases remain historical audit evidence; the expanded
`verified` list and `expansionAttempts` record the newer results. No output-based
deduplication is applied.
