import { createHash } from "node:crypto";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { signPublication } from "./sign-publication.mjs";

const env = process.env;
for (const name of ["GITHUB_RUN_ID", "GITHUB_ARTIFACT_ID"]) {
  if (!/^\d+$/.test(env[name] || "")) throw Error(`Invalid ${name}`);
}
if (!/^[a-f0-9]{40}$/.test(env.GITHUB_COMMIT || "") || !/^[a-f0-9]{64}$/.test(env.ARTIFACT_SHA256 || "")) throw Error("Invalid commit/artifact hash");
const headers = { Accept: "application/vnd.github+json", "User-Agent": "AuthoritySigning" };
async function github(path) {
  const response = await fetch(`https://api.github.com/repos/Bitcadia/Authority/${path}`, { headers });
  if (!response.ok) throw Error(`GitHub metadata HTTP ${response.status}`);
  return response.json();
}
const run = await github(`actions/runs/${env.GITHUB_RUN_ID}`);
if (run.event !== "workflow_dispatch" || run.head_branch !== "main" || run.head_sha !== env.GITHUB_COMMIT ||
    run.path !== ".github/workflows/publish.yml" || run.repository.full_name !== "Bitcadia/Authority") throw Error("Untrusted publication run");
const jobs = await github(`actions/runs/${env.GITHUB_RUN_ID}/jobs`);
if (!jobs.jobs.some(job => job.name === "build" && job.conclusion === "success")) throw Error("Publication build not successful");
const artifact = await github(`actions/artifacts/${env.GITHUB_ARTIFACT_ID}`);
if (String(artifact.workflow_run.id) !== env.GITHUB_RUN_ID || artifact.name !== `authority-unsigned-${env.GITHUB_COMMIT}` || artifact.expired ||
    artifact.digest !== `sha256:${env.ARTIFACT_SHA256}`) throw Error("Artifact provenance mismatch");
const url = new URL(env.ARTIFACT_DOWNLOAD_URL);
if (url.protocol !== "https:" || !url.hostname.endsWith(".blob.core.windows.net")) throw Error("Unexpected artifact storage host");
const response = await fetch(url, { redirect: "error" });
if (!response.ok) throw Error(`Artifact HTTP ${response.status}`);
const data = Buffer.from(await response.arrayBuffer());
if (data.length > 100_000_000 || createHash("sha256").update(data).digest("hex") !== env.ARTIFACT_SHA256) throw Error("Artifact digest mismatch");
const temp = env.AGENT_TEMPDIRECTORY;
if (!temp) throw Error("Agent temp directory missing");
const zip = join(temp, "unsigned.zip");
const output = join(temp, "signed-publication");
await writeFile(zip, data);
execFileSync("python3", ["-c", "import sys; sys.path.insert(0,'/opt/authority/tools'); from devops_hook import extract_zip; extract_zip(open(sys.argv[1],'rb').read(),sys.argv[2])", zip, output]);
const keys = await mkdtemp(join("/dev/shm/", "authority-keys-"));
try {
  for (const [file, variable] of [["bitcadia-authority.pem", "ROOT_PEM"], ["hylian.pem", "HYLIAN_PEM"], ["sm64.pem", "SM64_PEM"], ["smashremix.pem", "SMASHREMIX_PEM"]]) {
    if (!env[variable]?.includes("PRIVATE KEY")) throw Error(`Missing Key Vault PEM: ${variable}`);
    await writeFile(join(keys, file), env[variable], { mode: 0o600 });
    delete env[variable];
  }
  await signPublication({ artifact: output, policyRoot: "/opt/authority", keyDirectory: keys, stateDirectory: "/state" });
  console.log("Signed verified GitHub publication using Key Vault PEMs");
} finally {
  await rm(keys, { recursive: true, force: true });
  await rm(zip, { force: true });
}
