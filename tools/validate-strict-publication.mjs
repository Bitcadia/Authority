#!/usr/bin/env node

import { createHash, createPublicKey, verify } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";

const root = resolve(process.argv[2] || ".");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const sites = ["", "sites/hylian", "sites/sm64", "sites/smashremix"];
for (const site of sites) {
  const prefix = site ? `${site}/` : "";
  const manifestBytes = await readFile(resolve(root, `${prefix}authority-manifest-v2.json`));
  const manifest = JSON.parse(manifestBytes);
  const payloadBytes = Buffer.from(manifest.payload, "base64url");
  const payload = JSON.parse(payloadBytes);
  const raw = Buffer.from(payload.authorityId.slice("ed25519:".length), "base64url");
  const publicKey = createPublicKey({ key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), raw]), format: "der", type: "spki" });
  if (manifest.signature.authorityId !== payload.authorityId || !verify(null, Buffer.concat([Buffer.from("bitcadia64-authority-manifest-v2\0"), payloadBytes]), publicKey, Buffer.from(manifest.signature.value, "base64url"))) throw new Error(`Invalid signature ${site || "root"}`);
  if (payload.sequence !== 2) throw new Error(`Unexpected sequence ${site || "root"}`);
  const previous = JSON.parse(await readFile(resolve(root, `${prefix}authority-manifest-v2-1-bitcadia64.json`)));
  if (payload.previousManifestSha256 !== sha(Buffer.from(previous.payload, "base64url"))) throw new Error(`Invalid previous hash ${site || "root"}`);
  for (const reference of [payload.registry, ...payload.peers.map((peer) => peer.registry)]) {
    if (reference.documentType !== "mod-registry-index") throw new Error("Unexpected document type");
    const relative = new URL(reference.url).pathname.replace(/^\/Bitcadia\/Authority\/main\//, "");
    const bytes = await readFile(resolve(root, relative));
    const value = JSON.parse(bytes);
    if (sha(bytes) !== reference.sha256 || bytes.length !== reference.size || value.games.length !== reference.gameCount) throw new Error(`Invalid index pin ${relative}`);
    for (const game of value.games) {
      const listPath = resolve(dirname(resolve(root, relative)), basename(new URL(game.list.url).pathname));
      const listBytes = await readFile(listPath);
      const list = JSON.parse(listBytes);
      if (sha(listBytes) !== game.list.sha256 || listBytes.length !== game.list.size || list.entries.length !== game.list.entryCount) throw new Error(`Invalid list pin ${listPath}`);
      for (const entry of list.entries) if (!entry.patch.size || !/^[0-9A-Fa-f]{64}$/.test(entry.patch.sha256) || !/^[0-9A-Fa-f]{64}$/.test(entry.output.sha256)) throw new Error(`Incomplete identity ${entry.id}`);
      for (const pick of game.picks) {
        const entry = list.entries.find((candidate) => candidate.id === pick.entryId);
        if (!entry || entry.output.sha256.toLowerCase() !== pick.outputSha256.toLowerCase()) throw new Error(`Invalid pick ${pick.entryId}`);
      }
    }
  }
  for (const peer of payload.peers) {
    const relative = new URL(peer.manifestUrl).pathname.replace(/^\/Bitcadia\/Authority\/main\//, "");
    const child = JSON.parse(await readFile(resolve(root, relative)));
    if (sha(Buffer.from(child.payload, "base64url")) !== peer.manifestSha256) throw new Error(`Invalid child pin ${relative}`);
  }
}
console.error("Validated strict root and sister publications");
