#!/usr/bin/env node

import { createHash, createPrivateKey, createPublicKey, sign } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(process.argv[2] || ".");
const keyRoot = resolve(process.argv[3]);
const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const expires = new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const base64url = (bytes) => Buffer.from(bytes).toString("base64url");
const atomic = async (path, bytes) => {
  const temporary = `${path}.tmp`;
  await writeFile(temporary, bytes);
  await rename(temporary, path);
};
const index = async (path) => {
  const bytes = await readFile(resolve(root, path));
  const value = JSON.parse(bytes);
  if (value.$schema !== "https://raw.githubusercontent.com/Bitcadia/Authority/main/schemas/mod-registry-index.schema.json" || value.schemaVersion != null) throw new Error(`Invalid strict index ${path}`);
  return { documentType: "mod-registry-index", url: `https://raw.githubusercontent.com/Bitcadia/Authority/main/${path}`, sha256: sha(bytes), size: bytes.length, gameCount: value.games.length, allowRedirects: false };
};
const previous = async (path) => sha(Buffer.from(JSON.parse(await readFile(resolve(root, path), "utf8")).payload, "base64url"));
const publish = async ({ directory = "", key, authorityId, displayName, registry, peers = [] }) => {
  const privateKey = createPrivateKey(await readFile(resolve(keyRoot, key)));
  const publicRaw = createPublicKey(privateKey).export({ type: "spki", format: "der" }).subarray(-32);
  const derived = `ed25519:${base64url(publicRaw)}`;
  if (derived !== authorityId) throw new Error(`Signing key mismatch for ${displayName}`);
  const prefix = directory ? `${directory}/` : "";
  const payload = {
    schemaVersion: 2,
    authorityId,
    displayName,
    sequence: 2,
    issuedAt: now,
    expiresAt: expires,
    previousManifestSha256: await previous(`${prefix}authority-manifest-v2-1-bitcadia64.json`),
    registry,
    peers,
  };
  const payloadBytes = Buffer.from(`${JSON.stringify(payload)}\n`);
  const signature = sign(null, Buffer.concat([Buffer.from("bitcadia64-authority-manifest-v2\0"), payloadBytes]), privateKey);
  const manifest = {
    $schema: "https://raw.githubusercontent.com/Bitcadia/Authority/main/schemas/authority-manifest-v2.schema.json",
    payload: base64url(payloadBytes),
    signature: { algorithm: "ed25519", authorityId, value: base64url(signature) },
  };
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest)}\n`);
  await atomic(resolve(root, `${prefix}authority-payload-v2-2-bitcadia64.json`), payloadBytes);
  await atomic(resolve(root, `${prefix}authority-manifest-v2-2-bitcadia64.json`), manifestBytes);
  await atomic(resolve(root, `${prefix}authority-payload-v2.json`), payloadBytes);
  await atomic(resolve(root, `${prefix}authority-manifest-v2.json`), manifestBytes);
  return { manifestUrl: `https://raw.githubusercontent.com/Bitcadia/Authority/main/${prefix}authority-manifest-v2.json`, manifestSha256: sha(payloadBytes), registry };
};

const hylian = await publish({ directory: "sites/hylian", key: "hylian.pem", authorityId: "ed25519:pO2u4qZEmHlFp2TccUt3vYmc1pVNm-riyBnpwmLVUwg", displayName: "Hylian Modding", registry: await index("sites/hylian/catalog/7257eab88af6432d66eb0d2fed3ca8578553bd3d385a2ae974d7b1166a205672.json") });
const sm64 = await publish({ directory: "sites/sm64", key: "sm64.pem", authorityId: "ed25519:A4Am7jdCAqDnq0SBKkBDBKGndSs-1E5avxNbAp43tcc", displayName: "SM64 Romhacks", registry: await index("sites/sm64/catalog/13ccbda3eb98924e905940ef16d4b41a07018a169ae9be1f3f0340e6abaee307.json") });
const smash = await publish({ directory: "sites/smashremix", key: "smashremix.pem", authorityId: "ed25519:GVmN8nDjUdyuaOFr333W9sRbdruOmWdBl2gZRsjY3Js", displayName: "Smash Remix", registry: await index("sites/smashremix/catalog/143b0916041700cd8a36e4cf25af3aea350e4f78164d32a0afed7eccb4a75e82.json") });
const peers = [smash, hylian, sm64].map((site) => ({ displayName: site === smash ? "Smash Remix" : site === hylian ? "Hylian Modding" : "SM64 Romhacks", registry: site.registry, manifestUrl: site.manifestUrl, manifestSha256: site.manifestSha256 }));
await publish({ key: "bitcadia-authority.pem", authorityId: "ed25519:Df--2beY1D0DvraD-y2kGO5m3P6jC1DAOqUIhLkT6ZE", displayName: "Bitcadia Authority", registry: await index("sites/rhdc/catalog/30dbc253587e443c8edf2cee102043ffcca9ee4024213155569fa8b8714bb94c.json"), peers });
console.error("Published strict sequence 2 for root and three sister authorities");
