# Omcadia signing runner

This container runs only the trusted Authority release signing job. It does not
check out PR code, run mise tasks, or build the publication. The installed signer
validates JSON and signs exact payload bytes with locally mounted keys.

## Access boundary (required before registration)

Create organization runner group `authority-signing` with:

- Repository access limited to `Bitcadia/Authority`.
- Public repositories explicitly allowed for this selected repository.
- Workflow access restricted to
  `Bitcadia/Authority/.github/workflows/publish.yml@refs/heads/main`.
- An `authority-signing` environment limited to `main`, with release reviewers.

Runner labels and environments alone do not prevent another workflow from
targeting a self-hosted runner. If the organization plan does not support selected
workflow restrictions, do not mount keys in a GitHub runner; use an isolated
signing service with authenticated request policy instead.

## Installation

Use the reviewed Authority source tree as the Docker build context. Commands below
run from `deploy/omcadia` in that tree.

1. Copy `.env.example` to `.env`.
2. Create `keys` and `state` directories, owned by container UID/GID `1001:123`,
   mode `0700`. Install `bitcadia-authority.pem`, `hylian.pem`, `sm64.pem`, and
   `smashremix.pem` in `keys`, owner `1001:123`, mode `0400`.
3. Save a short-lived **organization runner registration token** in
   `registration-token`, readable by UID 1001. Generate it with
   `gh api --method POST orgs/Bitcadia/actions/runners/registration-token --jq .token`.
   Do not store a PAT here. The registration token expires in one hour.
4. Run `docker compose -f compose.yml config --quiet`, then
   `docker compose -f compose.yml build` and `docker compose -f compose.yml up -d`.
5. Confirm the runner belongs to the restricted group and is idle. Clear the
   contents of `registration-token` after registration; runner credentials persist
   in `runner-state`. Start it before an approved release and stop afterward.

The image uses runner 2.337.0 with automatic runner updates disabled. Rebuild with
an updated supported runner image before GitHub's update deadline. Container has
no Docker socket, inbound ports, root user, or elevated capabilities. Signing keys
are read-only. State persists separately from runner work files.

## Signing state

Initial sequence and previous hashes come from the policy installed in the image.
Each authority must advance by one from `state/publication-state.json`. Repeating
the same sequence is accepted only for identical payload hashes. State is synced
and atomically replaced before signatures are written into the artifact.

Keep a protected backup of the state volume. Deleting it would reset rollback
protection to the image's initial policy. An interrupted signer can leave
`.signing-lock`; inspect state and ensure no signer is running before removing it.

Only public JSON is uploaded. Signing job uses the same-run artifact and a unique
temporary directory. A hosted verification job checks returned signatures before
Pages deployment. Local signer policy and tool updates require rebuilding the
reviewed image, not checking out arbitrary code on the signing runner.
