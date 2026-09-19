# Supplied EverDrive compatibility list

The user supplied 46 project/edition links from Reddit post `zsnvrh`.
The exact names and URLs are retained in `sources/everdrive-coverage.json`.
Reddit itself blocked retrieval, so this is a user-supplied claim list.

This pass adds 18 reproducible release records across 17 projects:

- The Janus Alternative and K7 Assignment 1.1.
- GoldenEye with Mario Characters 3.17 (older bundled patches tested but not
  substituted for the current release).
- Cartman, Bomberman stages, Three Stage Mod, Ganon's Ruin, Houston Triple Pack,
  DK World/Gex Scream TV, and Wizard's Quad Pack for Smash 64.
- Waluigi OOT 1.2, with original voice and Waluigi voice variants.
- F-Zero X Climax 1.1 USA, using the newly supported IPS decoder.
- Lug's Delightful Dioramas 1.02 Console Compatible, Super Mario 3D World 64 3.0,
  Return to Yoshi's Island Demo, Odyssey 64 Recreation 1.0, and Waluigi's Taco Stand.

Patches were applied twice with actual Bitcadia64 decoders; archive members were
checked through client extraction. Evidence is `sources/everdrive-verification.json`.
No gameplay or hardware test is asserted. Source screenshots were not blindly
assigned as default covers. Catalog candidate total is 1,662; signed deployment
requires a new sequence after live sequence 9.

## Coverage distinctions

24 listed items now have project coverage. Two have partial edition coverage,
two need edition clarification, and 18 remain blocked/pending. Project coverage
does not prove the exact listed historical version is included or console-safe.

- Ten Kurko links point to a creator profile rather than exact patch downloads.
  Previously checked collection required membership; no gated files were fetched.
- Killer vs Vendetta 4.0 fails the client output checksum against local GE USA.
- Perfect Dark Kakariko 1326 is a RAR release awaiting artifact verification;
  GoldenEye Kakariko 1325 is not a substitute.
- SM74 Console 1.0 is already reproduced, but its patch-transform recipe is not
  yet integrated into the direct-recipe publication builder.
- OverKart remains ambiguous and was previously cancelled by the user.
- San Andreas Kart 2.0 mirror download returned HTTP 403.
- Alfredo Lamberra, Blitz 2023, and the two VPW translations still need exact
  downloadable release identification.
- Doom's listed “Mercillus” resolves to existing Merciless Edition coverage;
  “Fighter Remix” points to Smash Remix, already present at 2.0.1.

Three Stage Mod's readme calls console compatibility “Hopefully.” Wizard's Quad
Pack disables single-player due to crashes. Those limitations override any
blanket inference from inclusion in an EverDrive list.
