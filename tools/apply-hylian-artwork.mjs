#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const inputPath = resolve(process.argv[2] || "sources/hylian-bps-registry-v1.json");
const artworkPath = resolve(process.argv[3] || "sources/hylian-artwork-pins-v1.json");
const outputPath = resolve(process.argv[4] || inputPath);
const source = JSON.parse(await readFile(inputPath, "utf8"));
const artwork = JSON.parse(await readFile(artworkPath, "utf8"));
const maximumArtworkSize = 8 * 1024 * 1024;

const sourceIdentity = (value) => {
  const normalized = structuredClone(value);
  for (const entry of normalized.entries || []) delete entry.artwork;
  return createHash("sha256").update(`${JSON.stringify(normalized)}\n`).digest("hex").toUpperCase();
};

if (artwork.schemaVersion !== 1 || artwork.sourceRegistryGeneratedAt !== source.generatedAt || artwork.sourceRegistrySha256 !== sourceIdentity(source)) {
  throw new Error("Artwork pins were generated from a different Hylian registry");
}
for (const entry of source.entries) {
  const pin = artwork.pins[entry.id];
  if (pin) {
    const metadataUrl = new URL(entry.source.metadataUrl);
    const modRoot = new URL("./", metadataUrl);
    const url = new URL(pin.url);
    if (url.origin !== "https://hylianmodding.com" || !url.pathname.startsWith(`${modRoot.pathname}screenshots/`)) throw new Error(`Unsafe artwork URL for ${entry.id}`);
    if (!Number.isInteger(pin.size) || pin.size < 1 || pin.size > maximumArtworkSize) throw new Error(`Invalid artwork size for ${entry.id}`);
    if (!/^[0-9A-F]{64}$/.test(pin.sha256 || "")) throw new Error(`Invalid artwork SHA-256 for ${entry.id}`);
    if (pin.sourcePage !== entry.projectUrl || pin.allowRedirects !== false) throw new Error(`Invalid artwork provenance for ${entry.id}`);
    entry.artwork = pin;
  }
  else delete entry.artwork;
}
if (source.entries.filter((entry) => entry.artwork).length !== artwork.artworkCount) throw new Error("Artwork pin count does not match generated entries");
const temporary = `${outputPath}.tmp`;
await writeFile(temporary, `${JSON.stringify(source, null, 2)}\n`, { encoding: "utf8", flag: "w" });
await rename(temporary, outputPath);
console.error(`Applied ${artwork.artworkCount} Hylian artwork pins to ${outputPath}`);
