#!/usr/bin/env node
import { createHash, createPublicKey, verify } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object"
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
export async function validatePublication(root, output, { requireSigned = false } = {}) {
  const config = JSON.parse(await readFile(resolve(root, "sources/publication.json")));
  const metadata = JSON.parse(await readFile(resolve(output, "publication-build.json")));
  if (typeof metadata.signed !== "boolean" || metadata.sequence !== config.sequence) throw Error("Invalid publication metadata");
  if (requireSigned && metadata.signed !== true) throw Error("Signed publication required");
  const local = url => {
    if (!url.startsWith(config.baseUrl)) throw Error(`Publication URL outside configured host: ${url}`);
    const relative = url.slice(config.baseUrl.length);
    if (!relative || relative.startsWith("/") || relative.includes("\\") || relative.includes("..") || relative.includes("%") || relative.includes("?") || relative.includes("#")) throw Error("Invalid publication path");
    return resolve(output, relative);
  };
  let entries = 0;
  for (const authority of config.authorities) {
    const prefix = authority.directory ? `${authority.directory}/` : "";
    const payloadBytes = await readFile(resolve(output, `${prefix}authority-payload.json`));
    const payload = JSON.parse(payloadBytes);
    if (payload.schemaVersion !== 2 || payload.displayName !== authority.displayName || payload.authorityId !== authority.authorityId || payload.sequence !== config.sequence ||
        payload.previousManifestSha256 !== authority.previousManifestSha256 || payload.issuedAt !== config.issuedAt ||
        payload.expiresAt !== config.expiresAt) throw Error("Publication identity mismatch");
    if (metadata.signed) {
      const manifest = JSON.parse(await readFile(resolve(output, `${prefix}authority-manifest.json`)));
      const key = createPublicKey({ key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), Buffer.from(authority.authorityId.slice(8), "base64url")]), type: "spki", format: "der" });
      if (manifest.payload !== payloadBytes.toString("base64url") || manifest.signature.authorityId !== authority.authorityId ||
          manifest.signature.algorithm !== "ed25519" || !verify(null, Buffer.concat([Buffer.from("bitcadia64-authority-manifest-v2\0"), payloadBytes]), key, Buffer.from(manifest.signature.value, "base64url"))) throw Error("Invalid publication signature");
    }
    const reference = payload.registry;
    const indexBytes = await readFile(local(reference.url));
    const index = JSON.parse(indexBytes);
    if (reference.documentType !== "mod-registry-index" || reference.allowRedirects !== false || sha(indexBytes) !== reference.sha256 || indexBytes.length !== reference.size || index.games.length !== reference.gameCount) throw Error("Invalid index pin");
    for (const game of index.games) {
      const listBytes = await readFile(local(game.list.url));
      const list = JSON.parse(listBytes);
      if (game.list.documentType !== "mod-registry" || game.list.allowRedirects !== false || sha(listBytes) !== game.list.sha256 || listBytes.length !== game.list.size || list.entries.length !== game.list.entryCount) throw Error("Invalid list pin");
      for (const entry of list.entries) {
        const { entrySha256, ...content } = entry;
        if (entrySha256 !== sha(Buffer.from(JSON.stringify(canonical(content))))) throw Error("Entry digest mismatch");
        if (!Number.isSafeInteger(entry.output?.size) || entry.output.size < 1 || entry.recipe?.type !== "apply-rom-patch" || entry.recipe?.input?.type !== "base-rom") throw Error("Invalid output/recipe");
        if (!Number.isSafeInteger(entry.patch?.size) || entry.patch.size < 1 || !/^[a-f0-9]{64}$/i.test(entry.patch.sha256) || !/^[a-f0-9]{64}$/i.test(entry.output?.sha256)) throw Error("Incomplete artifact identity");
        if (entry.base.normalizedSha256 !== game.base.normalizedSha256) throw Error("Base mismatch");
        entries++;
      }
      if (index.schemaVersion !== 2 || list.schemaVersion !== 2) throw Error("Unsupported registry schema");
      for (const pick of game.targets.flatMap(target => target.picks)) {
        const entry = list.entries.find(value => value.id === pick.entryId);
        if (!entry || entry.entrySha256 !== pick.entrySha256 || entry.output.sha256.toLowerCase() !== pick.outputSha256.toLowerCase()) throw Error("Invalid curated pick");
      }
    }
    const expectedPeers = authority === config.authorities[0] ? config.authorities.slice(1) : [];
    if (payload.peers.length !== expectedPeers.length) throw Error("Invalid peer count");
    for (const [i, peer] of payload.peers.entries()) {
      const expected = expectedPeers[i];
      if (peer.manifestUrl !== new URL(`${expected.directory}/authority-manifest.json`, config.baseUrl).href) throw Error("Invalid peer URL");
      const childBytes = await readFile(resolve(output, `${expected.directory}/authority-payload.json`));
      if (sha(childBytes) !== peer.manifestSha256 || JSON.stringify(JSON.parse(childBytes).registry) !== JSON.stringify(peer.registry)) throw Error("Invalid peer pin");
    }
  }
  return { entries, signed: metadata.signed };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length < 4 || process.argv.length > 5 || (process.argv[4] && process.argv[4] !== "--require-signed")) throw Error("usage: validate-publication.mjs ROOT OUTPUT [--require-signed]");
  console.log(await validatePublication(process.argv[2], process.argv[3], { requireSigned: process.argv[4] === "--require-signed" }));
}
