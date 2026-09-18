#!/usr/bin/env node
// Installed in the signer image. Never execute the artifact's own code.
import { createHash, createPrivateKey, createPublicKey, sign } from "node:crypto";
import { readFile, writeFile, mkdir, rename, rm, lstat, readdir, open } from "node:fs/promises";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validatePublication } from "./validate-publication.mjs";

const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const serialize = value => `${JSON.stringify(value)}\n`;

export async function signPublication({ artifact, policyRoot, keyDirectory, stateDirectory }) {
  artifact = resolve(artifact);
  const policy = JSON.parse(await readFile(resolve(policyRoot, "sources/publication.json")));
  // Reject links before opening any artifact file. No executable content is needed.
  async function checkTree(directory) {
    for (const name of await readdir(directory)) {
      const path = join(directory, name);
      const stat = await lstat(path);
      if (stat.isSymbolicLink()) throw Error("Artifact symlinks forbidden");
      if (stat.isDirectory()) await checkTree(path);
      else if (!stat.isFile() || !name.endsWith(".json")) throw Error("Only JSON artifacts accepted");
    }
  }
  await checkTree(artifact);
  const payloads = await Promise.all(policy.authorities.map(async authority => {
    const prefix = authority.directory ? `${authority.directory}/` : "";
    const bytes = await readFile(resolve(artifact, `${prefix}authority-payload.json`));
    return { authority, prefix, bytes, value: JSON.parse(bytes), hash: sha(bytes) };
  }));
  const sequence = payloads[0].value.sequence;
  if (!Number.isSafeInteger(sequence) || sequence < policy.sequence) throw Error("Invalid signing sequence");
  const lock = resolve(stateDirectory, ".signing-lock");
  await mkdir(lock); // Fail closed on concurrent invocation or interrupted signing.
  try {
    let previous;
    try { previous = JSON.parse(await readFile(resolve(stateDirectory, "publication-state.json"))); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
    const hashes = Object.fromEntries(payloads.map(p => [p.authority.id, p.hash]));
    const replay = previous && sequence === previous.sequence;
    if (replay && JSON.stringify(hashes) !== JSON.stringify(previous.hashes)) throw Error("Conflicting publication at signed sequence");
    if (!replay && sequence !== (previous ? previous.sequence + 1 : policy.sequence)) throw Error("Publication sequence must advance by one");
    for (const p of payloads) {
      if (p.value.sequence !== sequence || p.value.authorityId !== p.authority.authorityId) throw Error("Authority identity mismatch");
      const expected = replay ? previous.previousHashes[p.authority.id] : previous?.hashes[p.authority.id] ?? p.authority.previousManifestSha256;
      if (p.value.previousManifestSha256 !== expected) throw Error("Previous publication hash mismatch");
      if (!Number.isFinite(Date.parse(p.value.issuedAt)) || Date.parse(p.value.issuedAt) > Date.now() + 300000 || !(Date.parse(p.value.expiresAt) > Date.now())) throw Error("Invalid publication validity dates");
    }
    // Use local identities and URL policy; accept release-specific dates and chain values.
    const validationRoot = join(lock, "validation");
    await mkdir(join(validationRoot, "sources"), { recursive: true });
    await writeFile(join(validationRoot, "sources/catalog-sources.json"), await readFile(resolve(policyRoot, "sources/catalog-sources.json")));
    await writeFile(join(validationRoot, "sources/publication.json"), serialize({
      ...policy, sequence, issuedAt: payloads[0].value.issuedAt, expiresAt: payloads[0].value.expiresAt,
      authorities: policy.authorities.map((a, i) => ({ ...a, previousManifestSha256: payloads[i].value.previousManifestSha256 })),
    }));
    await validatePublication(validationRoot, artifact);
    const manifests = [];
    for (const p of payloads) {
      const key = createPrivateKey(await readFile(resolve(keyDirectory, p.authority.keyFile)));
      const raw = createPublicKey(key).export({ type: "spki", format: "der" }).subarray(-32);
      if (`ed25519:${raw.toString("base64url")}` !== p.authority.authorityId) throw Error("Signing key mismatch");
      manifests.push({ path: resolve(artifact, `${p.prefix}authority-manifest.json`), bytes: serialize({
        $schema: new URL("schemas/authority-manifest-v2.schema.json", policy.baseUrl).href,
        payload: p.bytes.toString("base64url"), signature: { algorithm: "ed25519", authorityId: p.authority.authorityId,
          value: sign(null, Buffer.concat([Buffer.from("bitcadia64-authority-manifest-v2\0"), p.bytes]), key).toString("base64url") },
      }) });
    }
    // Persist chain state before releasing signatures. Retries return identical signatures.
    const state = { sequence, hashes, previousHashes: Object.fromEntries(payloads.map(p => [p.authority.id, p.value.previousManifestSha256])) };
    const temporary = resolve(stateDirectory, "publication-state.tmp");
    const handle = await open(temporary, "w", 0o600);
    try { await handle.writeFile(serialize(state)); await handle.sync(); } finally { await handle.close(); }
    await rename(temporary, resolve(stateDirectory, "publication-state.json"));
    const directoryHandle = await open(stateDirectory, "r");
    try { await directoryHandle.sync(); } finally { await directoryHandle.close(); }
    for (const manifest of manifests) await writeFile(manifest.path, manifest.bytes);
    await writeFile(resolve(artifact, "publication-build.json"), serialize({ signed: true, sequence }));
    await validatePublication(validationRoot, artifact, { requireSigned: true });
  } finally { await rm(lock, { recursive: true, force: true }); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3) throw Error("usage: sign-publication.mjs ARTIFACT_DIRECTORY");
  await signPublication({ artifact: process.argv[2], policyRoot: "/opt/authority", keyDirectory: "/keys", stateDirectory: "/state" });
}
