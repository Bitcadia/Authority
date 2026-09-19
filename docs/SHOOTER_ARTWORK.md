# GoldenEye and Perfect Dark artwork audit

Live sequence 9 contains 12 GoldenEye mods and four Perfect Dark mods.
Goldfinger is present, but alphabetical ordering places it eleventh: outside
the ten cards visible at 1100x900. Searching `goldfinger` finds it, with its
existing pinned cover. The client now has a showing-range/navigation hint.

Sequence 9 had artwork for only Goldfinger, Tomorrow Never Dies, and Dark Noon.
Eight additional entry pins are prepared here:

- GoldenEye X: original N64 Vault image.
- Kakariko Village, Infiltration, Peach's Castle, Spectrum Emulation,
  both Unlock Everything variants, and Perfect Dark's CI gun-name mod:
  original RHDN screenshots.

Each new pin passed the native Windows client's real artwork downloader,
including exact size/SHA-256 verification, plus image decoding. Evidence is in
`sources/shooter-artwork-verification.json`.

The Vimm image mirror returns a generic site logo without a referrer. These
responses were decoded but rejected on visual inspection, and are not published.
Direct RHDN image URLs avoid that problem. Four Mord weapon-set records and
PDHP still lack a verified directly retrievable project image; named placeholders
remain rather than substituting unrelated box art.

Tomorrow Never Dies' existing image returned an HTTP 500/DownloadFailed during
this audit. Its pin is retained; external-host availability is not guaranteed.

These metadata changes are not live until a new signed publication. Never
overwrite sequence 9 with changed entry bytes.

Goldfinger's default collage is replaced with the 1051x727 front-cover image
hosted on the GoldenEye Wiki's Fandom CDN. The image was visually inspected;
its artwork sourcePage points to the wiki while mod provenance stays N64 Vault.
This changes artwork only, not patch/output pins or redistribution permissions.
The original LaunchBox candidate failed native-client retrieval. Its replacement
passed the native Windows client's `downloadArtworkScoped` size/SHA-256 checks
without redirects. The CDN returns WebP despite the `.jpg` URL; the actual
Windows client decoder successfully decoded it at 1051x727. New signed
publication is still required before it goes live.
