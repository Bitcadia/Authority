#!/usr/bin/env python3
"""Queue the signing pipeline and retrieve its result. No signing keys here."""
import base64
import io
import json
import os
from pathlib import Path
import time
import urllib.parse
import urllib.error
import urllib.request
import zipfile


def extract_zip(data, destination):
    destination = Path(destination).resolve()
    destination.mkdir(parents=True, exist_ok=False)
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        if sum(entry.file_size for entry in archive.infolist()) > 100_000_000:
            raise ValueError("Artifact exceeds size limit")
        for entry in archive.infolist():
            target = (destination / entry.filename).resolve()
            if not target.is_relative_to(destination) or "\\" in entry.filename:
                raise ValueError("Invalid artifact path")
            if (entry.external_attr >> 16) & 0o170000 == 0o120000:
                raise ValueError("Artifact symlink forbidden")
        archive.extractall(destination)


def main():
    base = "https://dev.azure.com/bitcadia/Bitcadia/_apis/"
    pat = os.environ["AZURE_DEVOPS_SIGNING_TOKEN"]
    auth = "Basic " + base64.b64encode((":" + pat).encode()).decode()

    def ado(path, body=None):
        req = urllib.request.Request(base + path, data=None if body is None else json.dumps(body).encode(),
            headers={"Authorization": auth, "Content-Type": "application/json"})
        return json.load(urllib.request.urlopen(req, timeout=60))

    repo = "Bitcadia/Authority"
    run = os.environ["GITHUB_RUN_ID"]
    commit = os.environ["GITHUB_SHA"]
    gh_headers = {"Authorization": "Bearer " + os.environ["GH_TOKEN"], "Accept": "application/vnd.github+json"}
    req = urllib.request.Request(f"https://api.github.com/repos/{repo}/actions/runs/{run}/artifacts", headers=gh_headers)
    artifacts = json.load(urllib.request.urlopen(req, timeout=60))["artifacts"]
    artifact = next(a for a in artifacts if a["name"] == "authority-unsigned-" + commit and not a["expired"])
    # Request a short-lived artifact URL without forwarding GitHub credentials to storage.
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *args, **kwargs):
            return None
    req = urllib.request.Request(artifact["archive_download_url"], headers=gh_headers)
    try:
        urllib.request.build_opener(NoRedirect).open(req, timeout=60)
        raise ValueError("Expected artifact download redirect")
    except urllib.error.HTTPError as error:
        if error.code != 302:
            raise
        download = error.headers["Location"]
    print("::add-mask::" + download)
    digest = artifact.get("digest", "")
    if not digest.startswith("sha256:"):
        raise ValueError("GitHub artifact digest required")
    variables = {
        "githubRunId": {"value": run}, "githubCommit": {"value": commit},
        "githubArtifactId": {"value": str(artifact["id"])},
        "artifactSha256": {"value": digest[7:]},
        "artifactDownloadUrl": {"value": download, "isSecret": True},
    }
    pipeline = int(os.environ["AZURE_DEVOPS_SIGNING_PIPELINE"])
    result = ado(f"pipelines/{pipeline}/runs?api-version=7.1", {"variables": variables})
    build_id = result["id"]
    print(f"DevOps signing build: https://dev.azure.com/bitcadia/Bitcadia/_build/results?buildId={build_id}", flush=True)
    deadline = time.monotonic() + 1800
    while time.monotonic() < deadline:
        result = ado(f"build/builds/{build_id}?api-version=7.1")
        if result["status"] == "completed":
            if result["result"] != "succeeded":
                raise RuntimeError("DevOps signing failed: " + str(result["result"]))
            break
        time.sleep(10)
    else:
        raise TimeoutError("DevOps signing timed out; inspect queued build before retrying")
    result = ado(f"build/builds/{build_id}/artifacts?artifactName=signed-publication&api-version=7.1")
    url = result["resource"]["downloadUrl"]
    if urllib.parse.urlparse(url).hostname not in ("dev.azure.com", "bitcadia.visualstudio.com"):
        raise ValueError("Unexpected DevOps artifact host")
    req = urllib.request.Request(url, headers={"Authorization": auth})
    data = urllib.request.urlopen(req, timeout=120).read(100_000_001)
    if len(data) > 100_000_000:
        raise ValueError("Signed artifact too large")
    extract_zip(data, "devops-result")
    source = Path("devops-result/signed-publication")
    if not (source / "publication-build.json").is_file():
        raise ValueError("Missing signed publication")
    source.rename("dist")


if __name__ == "__main__":
    main()
