# Romhack Plaza publication audit

Plaza supplied 25 N64 project records and 33 downloadable files. Each available
supported patch was applied to a local SHA-1-matched, big-endian ROM with the
Bitcadia64 BPS/VCDIFF decoder at commit
`285c1d1df92971ef5e3a476a8e4a17dfa917b80a`. Repeating the application produced the
same output SHA-256. ZIP members were also extracted with the client's production
archive adapter and checked against their recorded member hashes.

`sources/plaza-verification.json` records passing variants and failure reasons.
`sources/plaza-registry.json` selects 21 variants from 14 projects, excluding
archived Old/Older directories and duplicate output identities. IPS/PPF patches,
7z containers, missing local bases, and a wrong-base WiiVC patch were excluded.
No patch or ROM bytes are stored in this repository.

Plaza API download locators redirect to `gaia.romhackplaza.org`. Catalog entries
pin the resolved HTTPS location, byte size, container SHA-256, member identity,
and output SHA-256. These checks prove reproducible patching, not gameplay or
hardware compatibility. Save types use existing base-game catalog settings;
SM64 uses the client's conventional EEPROM 4K setting.

## Client protocol alignment

Publication now emits registry/index schema version 2, canonical entry digests,
explicit apply-rom-patch recipes, output sizes, and target groups. Earlier
Authority JSON did not satisfy the current Bitcadia64 parsers. Schema documents
are synchronized from the same client checkout.

Run the actual client parser acceptance check after building:

```sh
bash tools/build-client-catalog-check.sh /path/to/Bitcadia64 /tmp/client-catalog-check
node tools/check-client-catalogs.mjs /tmp/client-catalog-check dist
```

`sources/output-sizes.json` records sizes read from legacy BPS target headers and
VCDIFF output sizes reproduced with the decoder. Existing patch/output SHA-256
pins are retained. Entries whose size evidence cannot be recovered are excluded
explicitly rather than assigned a guessed size.

Sequence 4 contains 1,568 entries: 1,555 earlier entries plus 21 Plaza variants,
minus two unavailable RHDC patches and six outputs beyond the client's 78 MiB
limit. `sources/publication-exclusions.json` records each exclusion. All 12
generated catalog documents pass the actual client parsers. All 24 tested ZIP
members pass the client's archive adapter.
