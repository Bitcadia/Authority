# Curated mod revisions

Client-first rollout: deploy Bitcadia64's optional release-group support before
publishing these fields. Old strict parsers reject them. Advance publication
sequence after deployment; do not re-sign current sequence with different bytes.

`sources/release-groups.json` maps existing entry IDs to explicit projectId,
releaseId and releaseOrder. These values enter the canonical entry digest before
list/index hashing. Entries remain separate source records.

Initial groups cover archived Zelda Redux revisions. D-pad-left/right, 2x/3x text,
and Master Quest editions have distinct project IDs. Their relationship to other
editions is not guessed. Cross-site records can share group metadata only after
the curator establishes the same project/edition and release.

The updated client groups trusted direct releases within an authority and named
game, retaining exact base requirements on each revision/source record.
More Mods shows the newest ranked representative; REVISIONS opens all records.
Canonical picks remain explicit. Dependency targets use the existing target stack.

`sources/project-group-audit.json` records the full same-game/project-name audit:
21 repeated-name sets, 63 grouped records. Name normalization covers punctuation
and ampersands; archived RHDN project names come from verification evidence rather
than truncating a title at its first hyphen. Explicit edition decisions keep
console, Deluxe, multiplayer, HUD-player and text/D-pad variants separate.

All four Dawn & Dusk source/base-revision records share `zelda64-dawn-and-dusk`.
The client prefers a compatible representative, exposes all records under
REVISIONS, and can try another group source when artwork fails.

Requires Bitcadia64 PR #473 before publication. Advance sequence only when ready
to deploy, after checking the latest live signed head.
