# DevOps signing hook

GitHub builds; DevOps signs; GitHub verifies and deploys. No paid GitHub runner
group is required. The earlier GitHub runner configuration is superseded.

## Resources

- DevOps project: Bitcadia; private repository and pipeline: AuthoritySigning (8).
- Dedicated pool: AuthoritySigning (12); queue 43. Only pipeline 8 is authorized.
- Service connection: Authority-Publishing-KeyVault, using workload identity
  federation. Only pipeline 8 is authorized.
- Key Vault: Publishing, resource group Admin.
- Secrets: authority-root-pem, authority-hylian-pem, authority-sm64-pem,
  authority-smashremix-pem. The signing identity has Secrets User at each secret.
- Omcadia: `~/authority-signer/compose.devops.yml`, source in `source/`.

The private DevOps repository holds the reviewed `azure-pipelines.yml` copied
from this directory. It has no automatic triggers or checkout step. Restrict
edits to this repository and pipeline to release administrators. Updates require
review and explicit synchronization; public PR code never runs on the signer.

## GitHub environment

Environment `authority-signing` allows only main and requires release approval.
Set variable `AZURE_DEVOPS_SIGNING_PIPELINE=8` and secret
`AZURE_DEVOPS_SIGNING_TOKEN` to an organization-scoped Build Read & execute PAT.
The initial credential expires 2026-10-15; rotate it before expiry. PAT scope is
organization-wide, not pipeline-specific; prefer a dedicated queue-only identity
when configuring long-term credentials.

The hook sends exact run, commit and artifact IDs, SHA-256 and a short-lived
artifact URL as a secret variable. DevOps independently queries public GitHub
metadata and requires the main/manual publish workflow and successful build job.
The artifact must match GitHub's digest. Expired download URLs require a new
hook invocation. No GitHub PAT is stored in DevOps.

DevOps retrieves PEMs with AzureKeyVault@2. The installed signer writes temporary
key files to `/dev/shm` and removes them afterward. No key directory is mounted.
Only chain state persists in `/state`. The signed result is a DevOps build
artifact; GitHub waits for that exact run and downloads its output.

## Agent

Use `Dockerfile.devops`, `init-devops.sh`, and `compose.devops.yml`. Register with
a short-lived Agent Pools Read & manage PAT, then revoke it and empty
`devops-registration-token`. Agent credentials persist in the dedicated volume.
The container runs non-root without Docker socket or inbound ports. Keep it
separate from the existing shared omarchy-agent.

Build artifacts and logs must never include PEM values or registration tokens.
Original signing keys are now backed by Key Vault; superseded host key copies
can be removed after the Key Vault signing path has passed verification.
