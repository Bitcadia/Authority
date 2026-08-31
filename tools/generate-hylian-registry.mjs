#!/usr/bin/env node

import { readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const snapshotPath = resolve(process.argv[2] || "sources/hylian-registry-snapshot-v1.json");
const pinsPath = resolve(process.argv[3] || "sources/hylian-artifact-pins-v1.json");
const outputPath = resolve(process.argv[4] || "sources/hylian-bps-registry-v1.json");
const existingPath = resolve(process.argv[5] || outputPath);
const overridesPath = resolve(process.argv[6] || "sources/hylian-release-overrides-v1.json");
const snapshot = JSON.parse(await readFile(snapshotPath, "utf8"));
const pins = JSON.parse(await readFile(pinsPath, "utf8"));
const existing = JSON.parse(await readFile(existingPath, "utf8"));
const overrides = JSON.parse(await readFile(overridesPath, "utf8"));
if (pins.sourceCapturedAt !== snapshot.source.capturedAt) throw new Error("Artifact pins were generated from a different Hylian snapshot");

const bases = {
  CD16C529: { name: "The Legend of Zelda: Ocarina of Time", variant: "USA", gameCode: "CZLE", normalizedCrc32: "CD16C529", normalizedSha256: "C916AB315FBE82A22169BFF13D6B866E9FDDC907461EB6B0A227B82ACDF5B506" },
  B428D8A7: { name: "The Legend of Zelda: Majora's Mask", variant: "USA", gameCode: "NZSE", normalizedCrc32: "B428D8A7", normalizedSha256: "EFB1365B3AE362604514C0F9A1A2D11F5DC8688BA5BE660A37DEBF5E3BE43F2B" }
};
const records = new Map(snapshot.records.map((record) => [record.metadata.id, record]));
const entryId = (id) => `hylian-${String(id).normalize("NFKC").replace(/[^A-Za-z0-9_]+/g, "")}`;
const existingAuthors = new Map(existing.entries.map((entry) => [entry.id, entry.authors]));
const normalizeAuthors = (authors) => [...new Set((authors || []).flatMap((author) => author.split(/\s*&\s*/)).map((author) => author.trim()).filter(Boolean))];
const entries = [];
for (const [id, pin] of Object.entries(pins.pins)) {
  const record = records.get(id);
  if (!record) throw new Error(`Artifact pin references missing metadata: ${id}`);
  const metadata = record.metadata;
  const base = bases[pin.baseCrc32];
  if (!base) throw new Error(`Artifact pin has unsupported base: ${id}`);
  const patch = {
    format: pin.format,
    url: pin.url,
    size: pin.size,
    sha256: pin.sha256,
    allowRedirects: false
  };
  for (const field of ["archiveMember", "memberSize", "memberSha256", "sourceCrc32", "targetCrc32", "patchCrc32", "vcdiffProfile"]) {
    if (pin[field] !== undefined) patch[field] = pin[field];
  }
  const generatedId = entryId(id);
  const overrideAuthors = overrides.overrides?.[id]?.authors;
  entries.push({
    id: generatedId,
    name: metadata.name.trim().replaceAll(",", ";"),
    version: pin.version,
    authors: overrideAuthors || existingAuthors.get(generatedId) || normalizeAuthors(metadata.authors),
    projectUrl: new URL(`./`, record.metadataUrl).href,
    source: { provider: "hylianmodding.com", metadataUrl: record.metadataUrl, retrievedAt: snapshot.source.capturedAt },
    base,
    patch,
    output: {},
    compatibility: String(metadata.completion_status || "unverified").toLowerCase(),
    saveType: "sram",
    rights: { patchRedistributionAllowed: false, artworkRedistributionAllowed: false }
  });
}
entries.sort((left, right) => left.id.localeCompare(right.id));
if (entries.length !== pins.pinCount) throw new Error("Generated entry count does not match artifact pins");
const registry = {
  $schema: "https://raw.githubusercontent.com/DrSammyD/m64menu/main/schemas/mod-registry-v1.schema.json",
  schemaVersion: 1,
  generatedAt: snapshot.source.capturedAt,
  notice: "Live index of original-site patch URLs from Hylian Modding and named publishers. This catalog contains no ROM data. Patch files are not redistributed; clients fetch exact pinned artifacts from their original HTTPS URLs.",
  entries
};
const temporary = `${outputPath}.tmp`;
await writeFile(temporary, `${JSON.stringify(registry, null, 2)}\n`, { encoding: "utf8", flag: "w" });
await rename(temporary, outputPath);
console.error(`Generated ${entries.length} Hylian entries at ${outputPath}`);
