#!/usr/bin/env node
import { createHash, createPublicKey, verify } from "node:crypto";
import { mkdir, readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export function verifyHistoricalManifest(bytes, authorities) {
  const manifest = JSON.parse(bytes);
  const payloadBytes = Buffer.from(manifest.payload, "base64url");
  const payload = JSON.parse(payloadBytes);
  if (!authorities.includes(payload.authorityId) || manifest.signature?.authorityId !== payload.authorityId || manifest.signature.algorithm !== "ed25519" || !Number.isSafeInteger(payload.sequence) || payload.sequence < 1) throw Error("Invalid history identity");
  const key = createPublicKey({ key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), Buffer.from(payload.authorityId.slice(8), "base64url")]), format: "der", type: "spki" });
  if (!verify(null, Buffer.concat([Buffer.from("bitcadia64-authority-manifest-v2\0"), payloadBytes]), key, Buffer.from(manifest.signature.value, "base64url"))) throw Error("Invalid history signature");
  return { payload, hash: createHash("sha256").update(payloadBytes).digest("hex") };
}

export async function buildHistory(root, output) {
  const config = JSON.parse(await readFile(resolve(root, "sources/publication.json")));
  const authorities = config.authorities.map(a => a.authorityId);
  const records = new Map();
  const heads = new Map();
  function add(bytes, expectedHash) {
    if (bytes.length > 1024 * 1024) throw Error("History manifest too large");
    const record = verifyHistoricalManifest(bytes, authorities);
    if (expectedHash && record.hash !== expectedHash) throw Error("History hash mismatch");
    const identity = `${record.payload.authorityId}:${record.payload.sequence}`;
    if (heads.has(identity) && heads.get(identity) !== record.hash) throw Error("History equivocation");
    heads.set(identity, record.hash);
    records.set(record.hash, { ...record, bytes });
    if (records.size > 4096) throw Error("History budget exceeded");
  }
  async function get(url, optional = false) {
    const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(30000) });
    if (optional && response.status === 404) return null;
    if (!response.ok) throw Error(`History HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 1024 * 1024) throw Error("History response too large");
    return bytes;
  }
  const index = await get(new URL("history/index.json", config.baseUrl), true);
  if (index) {
    const hashes = JSON.parse(index).hashes;
    if (!Array.isArray(hashes) || hashes.length > 4096 || hashes.some(h => !/^[a-f0-9]{64}$/.test(h))) throw Error("Invalid history index");
    for (const hash of hashes) add(await get(new URL(`history/${hash}.json`, config.baseUrl)), hash);
  } else {
    // One-time recovery of pre-history publications from original signed artifacts.
    const seeds = [35036217638, 35168463809, 35219504648, 35221149846, 35246316943];
    const temporary = await mkdtemp(join(tmpdir(), "authority-history-"));
    try {
      for (const run of seeds) {
        const runInfo = JSON.parse(execFileSync("gh", ["run", "view", String(run), "--repo", "Bitcadia/Authority", "--json", "conclusion,headSha"], { encoding: "utf8" }));
        if (runInfo.conclusion !== "success") throw Error("Unsuccessful history seed run");
        const directory = join(temporary, String(run));
        execFileSync("gh", ["run", "download", String(run), "--repo", "Bitcadia/Authority", "--name", `authority-signed-${runInfo.headSha}`, "--dir", directory]);
        for (const authority of config.authorities) add(await readFile(join(directory, authority.directory, "authority-manifest.json")));
      }
      // Sequence 2 predates generated artifacts and is retained in immutable Git history.
      for (const authority of config.authorities) {
        const prefix = authority.directory ? `${authority.directory}/` : "";
        add(await get(`https://raw.githubusercontent.com/Bitcadia/Authority/e288aa6381569e2b8043d4de72d9953cdf7e6bb8/${prefix}authority-manifest-v2.json`));
      }
    } finally { await rm(temporary, { recursive: true, force: true }); }
  }
  for (const authority of config.authorities) {
    // Preserve the deployed head as well as the new head before Pages replacement.
    const prefix = authority.directory ? `${authority.directory}/` : "";
    add(await get(new URL(`${prefix}authority-manifest.json`, config.baseUrl)));
    add(await readFile(resolve(output, prefix, "authority-manifest.json")));
  }
  for (const { payload } of records.values()) {
    if (payload.sequence <= 2) continue;
    const previous = records.get(payload.previousManifestSha256);
    if (!previous || previous.payload.authorityId !== payload.authorityId || previous.payload.sequence + 1 !== payload.sequence) throw Error("Incomplete signed history chain");
  }
  const directory = resolve(output, "history");
  await mkdir(directory, { recursive: true });
  for (const [hash, record] of records) await writeFile(join(directory, `${hash}.json`), record.bytes);
  await writeFile(join(directory, "index.json"), JSON.stringify({ hashes: [...records.keys()].sort() }) + "\n");
  console.log(`Retained ${records.size} signed historical manifests`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildHistory(process.argv[2] || ".", process.argv[3] || "dist");
