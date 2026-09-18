#!/usr/bin/env node
import { createHash, createPrivateKey, createPublicKey, sign } from "node:crypto";
import { mkdir, readFile, writeFile, cp, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const bytes = value => Buffer.from(`${JSON.stringify(value)}\n`);
const sha = value => createHash("sha256").update(value).digest("hex");
const domain = Buffer.from("bitcadia64-authority-manifest-v2\0");

// A fresh output directory prevents stale publications from entering artifacts.
export async function buildPublication({ root, output, keyDirectory }) {
  root = resolve(root);
  output = resolve(output);
  const config = JSON.parse(await readFile(resolve(root, "sources/publication.json")));
  if (!Number.isSafeInteger(config.sequence) || config.sequence < 1) throw Error("Invalid publication sequence");
  if (!Number.isFinite(Date.parse(config.issuedAt)) || !(Date.parse(config.expiresAt) > Date.parse(config.issuedAt))) throw Error("Invalid publication dates");
  if (!config.baseUrl.startsWith("https://") || !config.baseUrl.endsWith("/")) throw Error("Invalid publication base URL");
  await mkdir(output); // Fail rather than overwrite an existing artifact.
  await cp(resolve(root, "schemas"), resolve(output, "schemas"), { recursive: true });
  const registries = new Map();
  const sources = JSON.parse(await readFile(resolve(root, "sources/catalog-sources.json"))).catalogs;
  const assigned = new Set();
  for (const authority of sources) {
    const path = `sites/${authority.id}/catalog/`;
    const entries = [];
    for (const input of authority.inputs) {
      const document = JSON.parse(await readFile(resolve(root, `sources/${input}-registry.json`)));
      for (const entry of document.entries) if (authority.providers.includes(entry.source.provider)) {
        const key = `${input}:${entry.id}`;
        if (assigned.has(key)) throw Error(`Repeated source assignment: ${key}`);
        assigned.add(key);
        entries.push(entry);
      }
    }
    const registryPath = resolve(output, ".source.json");
    await writeFile(registryPath, bytes({
      $schema: "https://raw.githubusercontent.com/Bitcadia/Authority/main/schemas/mod-registry.schema.json",
      generatedAt: config.issuedAt,
      notice: `${authority.displayName} source catalog. Backup maintained and hosted by Bitcadia; not a claim of publisher endorsement or publisher-controlled signing. Metadata only; original source and artifact hosts retained per entry.`,
      entries,
    }));
    const result = execFileSync(process.execPath, [
      resolve(root, "tools/build-base-rom-catalog.mjs"),
      registryPath,
      resolve(output, path), new URL(path, config.baseUrl).href,
      resolve(root, "sources/canonical-picks.json"), authority.id,
    ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    // Builder returns its generated index pin on stdout.
    const pin = JSON.parse(result);
    await rm(registryPath);
    registries.set(authority.id, {
      documentType: "mod-registry-index", url: new URL(`${path}${pin.index}`, config.baseUrl).href,
      sha256: pin.sha256, size: pin.size, gameCount: pin.gameCount, allowRedirects: false,
    });
  }
  for (const input of new Set(sources.flatMap(source => source.inputs))) {
    const document = JSON.parse(await readFile(resolve(root, `sources/${input}-registry.json`)));
    for (const entry of document.entries) if (!assigned.has(`${input}:${entry.id}`)) throw Error(`Unattributed entry: ${input}:${entry.id}`);
  }
  const peers = sources.filter(source => source.signer === "root").map(source => ({ displayName: source.displayName, registry: registries.get(source.id) }));
  // Sister manifests must be built before the root binds their payload hashes.
  for (const authority of [...config.authorities.slice(1), config.authorities[0]]) {
    const payload = {
      schemaVersion: 2, authorityId: authority.authorityId, displayName: authority.displayName,
      sequence: config.sequence, issuedAt: config.issuedAt, expiresAt: config.expiresAt,
      previousManifestSha256: authority.previousManifestSha256,
      ...(authority === config.authorities[0] ? {} : { registry: registries.get(authority.id) }),
      peers: authority === config.authorities[0] ? [...peers] : [],
    };
    if (!/^[a-f0-9]{64}$/.test(payload.previousManifestSha256)) throw Error("Invalid previous manifest hash");
    const prefix = authority.directory ? `${authority.directory}/` : "";
    await mkdir(resolve(output, prefix), { recursive: true });
    const payloadBytes = bytes(payload);
    await writeFile(resolve(output, `${prefix}authority-payload.json`), payloadBytes);
    if (keyDirectory) {
      const key = createPrivateKey(await readFile(resolve(keyDirectory, authority.keyFile)));
      const raw = createPublicKey(key).export({ type: "spki", format: "der" }).subarray(-32);
      if (`ed25519:${raw.toString("base64url")}` !== authority.authorityId) throw Error(`Signing key mismatch: ${authority.id}`);
      await writeFile(resolve(output, `${prefix}authority-manifest.json`), bytes({
        $schema: new URL("schemas/authority-manifest-v2.schema.json", config.baseUrl).href,
        payload: payloadBytes.toString("base64url"),
        signature: { algorithm: "ed25519", authorityId: authority.authorityId,
          value: sign(null, Buffer.concat([domain, payloadBytes]), key).toString("base64url") },
      }));
    }
    if (authority !== config.authorities[0]) peers.push({
      displayName: authority.displayName, registry: payload.registry,
      manifestUrl: new URL(`${prefix}authority-manifest.json`, config.baseUrl).href,
      manifestSha256: sha(payloadBytes),
    });
  }
  await writeFile(resolve(output, "publication-build.json"), bytes({ signed: Boolean(keyDirectory), sequence: config.sequence }));
  return config;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length < 4 || process.argv.length > 5) throw Error("usage: build-publication.mjs ROOT NEW_OUTPUT [KEY_DIRECTORY]");
  await buildPublication({ root: process.argv[2], output: process.argv[3], keyDirectory: process.argv[4] });
}
