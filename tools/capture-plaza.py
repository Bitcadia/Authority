#!/usr/bin/env python3
"""Capture N64 metadata only; keep API credentials out of files and logs."""
import datetime
import json
from pathlib import Path
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request

BASE = "https://romhackplaza.org/api/v1/"

def main():
    key = json.loads(subprocess.check_output([
        "az", "keyvault", "secret", "show", "--vault-name", "Publishing",
        "--name", "romhackplaza-api-key", "-o", "json",
    ]))["value"].strip()
    if not key or any(ord(c) < 33 or ord(c) > 126 for c in key):
        raise ValueError("Invalid API key characters; secret value suppressed")

    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *args, **kwargs):
            return None

    opener = urllib.request.build_opener(NoRedirect)
    last_request = 0

    def get(path):
        nonlocal last_request
        url = urllib.parse.urljoin(BASE, path)
        if not url.startswith(BASE):
            raise ValueError("Unexpected API URL")
        time.sleep(max(0, 2.5 - (time.monotonic() - last_request)))
        last_request = time.monotonic()
        req = urllib.request.Request(url, headers={
            "Authorization": "Bearer " + key, "Accept": "application/json",
            "User-Agent": "Bitcadia-Authority/1.0",
        })
        with opener.open(req, timeout=30) as response:
            value = json.load(response)
        if value.get("ok") is not True:
            raise ValueError("API did not return ok=true")
        return value

    output = Path(__file__).resolve().parents[1] / "scratch/plaza-capture.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    state = {"source": BASE, "capturedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
             "listing": [], "records": [], "errors": [], "complete": False}
    try:
        path = "entries/search?platforms%5B0%5D=5&types%5B0%5D=romhacks&per_page=100"
        while path:
            page = get(path)
            state["listing"].extend(page["data"])
            path = page.get("links", {}).get("next")
        for item in state["listing"]:
            entry_id = int(item["id"])
            detail = get(f"entries/{entry_id}")["data"]
            downloads = get(f"entries/{entry_id}/download")["data"]
            state["records"].append({"id": entry_id, "detail": detail, "downloads": downloads})
            print(f"Captured entry {entry_id}", flush=True)
        state["complete"] = True
    except urllib.error.HTTPError as error:
        state["errors"].append({"status": error.code, "challenge": error.headers.get("cf-mitigated")})
        print(f"Stopped: API HTTP {error.code}", flush=True)
    except Exception as error:
        state["errors"].append({"type": type(error).__name__})
        print(f"Stopped: {type(error).__name__}; details suppressed", flush=True)
    finally:
        output.write_text(json.dumps(state, indent=2, ensure_ascii=False) + "\n")
        print(f"Saved {len(state['records'])}/{len(state['listing'])} entries to {output}")

if __name__ == "__main__":
    main()
