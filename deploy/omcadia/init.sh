#!/usr/bin/env bash
set -Eeuo pipefail
[[ "$(id -u)" != 0 ]] || { echo "Runner must not run as root" >&2; exit 1; }
cd /home/runner
export HOME=/home/runner
[[ -w /state && -r /keys ]] || { echo "Check state/key mount permissions" >&2; exit 1; }
if [[ ! -f .runner ]]; then
  : "${RUNNER_URL:?Organization URL required}"
  : "${RUNNER_GROUP:?Restricted runner group required}"
  [[ "$RUNNER_URL" == https://github.com/Bitcadia ]] || { echo "Unexpected runner organization" >&2; exit 1; }
  token="$(< /run/secrets/registration_token)"
  [[ -n "$token" ]] || { echo "Short-lived registration token required" >&2; exit 1; }
  ./config.sh --unattended --url "$RUNNER_URL" --token "$token" \
    --runnergroup "$RUNNER_GROUP" --name "${RUNNER_NAME:-omcadia-authority-signing}" \
    --labels authority-signing --work _work --disableupdate
  unset token
fi
exec ./run.sh "$@"
