#!/usr/bin/env bash
set -Eeuo pipefail
cd /agent
if [[ ! -f .agent ]]; then
  token="$(< /run/secrets/registration_token)"
  ./config.sh --unattended --url https://dev.azure.com/bitcadia --auth pat --token "$token" \
    --pool AuthoritySigning --agent omcadia-authority-signing --work _work --acceptTeeEula
  unset token
fi
exec ./run.sh
