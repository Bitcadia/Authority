# Recovered source-import tooling

These tools and metadata were recovered from staged work that had not reached
`main`. They support research and base-ROM matching, not signed publication.

- `rdhn.json`: original browser capture, retained byte-for-byte in Windows-1252.
- `sources/rhdn-downloads.json`: source-reported RHDN download index.
- `sources/plaza-downloads.json`: source-reported Plaza download index.
- `tools/map-rhdn-games.mjs`: map captured titles and report conflicting evidence.
- `tools/match-rhdn-roms.mjs`: match source SHA-1 requirements against a local
  big-endian ROM inventory. This does not verify patch output.
- `tools/import-rhdn-source.mjs` and `tools/import-plaza.mjs`: produce research
  download indexes. Their outputs are not `*-registry.json` publications.
- `tools/capture-plaza.py`: fetch Plaza metadata using the existing Key Vault
  API credential. It does not fetch patches or ROMs.

RHDN readers accept strict UTF-8 first, then Windows-1252 for the legacy
capture. They do not silently substitute replacement characters. A malformed
description can be recovered by the planning-only mapper; the importer still
requires valid JSON and matching source IDs.

Example workflow:

```sh
node tools/map-rhdn-games.mjs rdhn.json scratch/rhdn-game-map.json
node tools/match-rhdn-roms.mjs scratch/rhdn-game-map.json LOCAL_INVENTORY.json scratch/rhdn-base-map.json
node tools/import-rhdn-source.mjs rdhn.json scratch/rhdn-downloads.json scratch/rhdn-base-map.json
```

The checked-in indexes are historical snapshots, not current host-availability
claims. Source-reported base identities and name matches are not admission
evidence. Every proposed release still needs the normal artifact, base and
output verification before entering a signed catalog. `catalog-sources.json`
does not route these research files into publications.
