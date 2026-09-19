# Artwork coverage audit — sequence 11 follow-up

The earlier audit verified individual downloads and image decoding but did not
verify the Windows browser. That missed a TLS transport failure affecting
GameBanana images and an indefinite failed-card state in the client.

## Catalog inventory

Sequence 11 contains 1,662 entries, of which 1,553 have artwork pins. A pin is
metadata coverage, not proof that an image downloads or renders.

| Game | Entries | Sequence 11 pins | Proposed pins |
| --- | ---: | ---: | ---: |
| Mario Kart 64 | 14 | 2 | 9 |
| GoldenEye 007 | 15 | 11 | 11 |
| Perfect Dark | 4 | 3 | 3 |

Seven new pins cover Amped Up 3.00 and 3.21, 4 Player Grand Prix, Battle Kart
1.0, CPUs Use Human Items, Hot Potato Battle, and Amagami Mario Kart. Amped Up
uses its project title-screen image, shared across releases; it is not a claim
that the screenshot depicts every version. Other additions use project-page
screenshots. All were visually inspected. Mod, patch, and output identities
are unchanged.

## Explicit gaps

- Four Hooting HUD variants: tested RHDN screenshot endpoints return 404.
- Four Mord weapon-set variants: tested RHDN screenshot endpoints return 404.
- Battle Kart 2.0: no verified image for this release. The 1.0 image is not
  automatically assigned across editions or source scopes.
- Perfect Dark High Performance: no verified mod-specific image.

These ten records retain named placeholders. Other games have 92 unpinned
records in sequence 11; they were inventoried, not download/render-certified.
The inventory totals must not be presented as an exhaustive visual pass.

## Windows findings

- Sequence 11 GoldenEye Mario metadata was already present in the user's
  snapshot. Its first image download failed and left a retry sidecar. The
  browser never retried that visible failed card.
- A cold-cache Mario Kart browser reproduced zero mod images. Both pinned
  GameBanana images failed with `TlsInitializationFailed`; the other twelve
  records had no pin.
- A Windows HTTPS fallback now retrieves both GameBanana images with the
  original size and SHA-256. It verifies certificates and rejects redirects.
- N64 Vault occasionally returns HTTP errors. Retrying after backoff recovered
  Dark Noon; no hash or signature checks were relaxed.

Client regression and rendering evidence are documented in
`Bitcadia64/docs/MOD_ARTWORK_TEST_MATRIX.md`. Proposed metadata requires a new
signed publication; client transport and retry fixes require an updated EXE.

All 33 entries were visited in isolated Windows browser runs using local
unsigned imports of the generated entries. Successful GPU-upload diagnostics
account for all 23 pinned entries; ten explicitly unpinned entries remain
placeholders. Screenshots were inspected for the wide and reopened views.
Evidence: `/tmp/opencode/{kart,ge,pd}-complete-ui/`. All nine proposed Mario Kart
pins passed native-client size/hash checks, including the seven new pins.
This validates the proposed entries, not a released signed update.
