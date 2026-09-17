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

The client groups trusted direct releases within an authority and exact base.
More Mods shows the newest ranked representative; REVISIONS opens all records.
Canonical picks remain explicit. Dependency targets use the existing target stack.
