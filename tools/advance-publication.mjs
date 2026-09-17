import { readFile, writeFile } from "node:fs/promises";
import { createHash, createPublicKey, verify } from "node:crypto";
const path = new URL("../sources/publication.json", import.meta.url);
const config = JSON.parse(await readFile(path));
const sequences = new Set();
for (const authority of config.authorities) {
  const prefix = authority.directory ? `${authority.directory}/` : "";
  const response = await fetch(new URL(`${prefix}authority-manifest.json`, config.baseUrl), { redirect: "error" });
  if (!response.ok) throw Error(`HTTP ${response.status}`);
  const manifest = await response.json();
  const bytes = Buffer.from(manifest.payload, "base64url");
  const key = createPublicKey({ key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), Buffer.from(authority.authorityId.slice(8), "base64url")]), type: "spki", format: "der" });
  if (manifest.signature.authorityId !== authority.authorityId || !verify(null, Buffer.concat([Buffer.from("bitcadia64-authority-manifest-v2\0"), bytes]), key, Buffer.from(manifest.signature.value, "base64url"))) throw Error("Invalid previous signature");
  const payload = JSON.parse(bytes);
  if (payload.authorityId !== authority.authorityId) throw Error("Authority identity mismatch");
  authority.previousManifestSha256 = createHash("sha256").update(bytes).digest("hex");
  sequences.add(payload.sequence);
}
if (sequences.size !== 1) throw Error("Authorities must share publication sequence");
config.sequence = [...sequences][0] + 1;
config.issuedAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
config.expiresAt = new Date(Date.now() + 3650 * 86400000).toISOString().replace(/\.\d{3}Z$/, "Z");
await writeFile(path, JSON.stringify(config, null, 2) + "\n");
console.log(`Prepared sequence ${config.sequence}`);
