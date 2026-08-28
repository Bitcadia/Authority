#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";

const sourcePath = resolve(process.argv[2] || "sources/rhdc-bps-registry-v1.json");
const outputDirectory = resolve(process.argv[3] || "sites/rhdc/catalog");
const publicBaseUrl = process.argv[4] || "https://raw.githubusercontent.com/Bitcadia/Authority/main/sites/rhdc/catalog/";
const picksPath = resolve(process.argv[5] || "sources/canonical-picks-v1.json");
const authorityId = process.argv[6] || basename(dirname(outputDirectory));
const source = JSON.parse(await readFile(sourcePath, "utf8"));
const curation = JSON.parse(await readFile(picksPath, "utf8"));
const indexSchema = "https://raw.githubusercontent.com/DrSammyD/m64menu/main/schemas/mod-registry-index-v1.schema.json";
const canonicalCategories = new Set(["the-sequel", "the-dlc", "the-replacement", "the-experiment"]);
const groups = new Map();

for (const entry of source.entries || []) {
  const key = entry.base?.normalizedSha256?.toUpperCase();
  if (!/^[0-9A-F]{64}$/.test(key || "")) throw new Error(`Invalid base SHA-256 for ${entry.id}`);
  const existing = groups.get(key);
  if (existing) {
    if (JSON.stringify(existing.base) !== JSON.stringify(entry.base)) throw new Error(`Conflicting metadata for base ${key}`);
    existing.entries.push(entry);
  } else {
    groups.set(key, { base: entry.base, entries: [entry] });
  }
}
if (groups.size === 0) throw new Error("Source registry contains no entries");

const serialized = (value) => Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const writeAtomic = async (path, bytes) => {
  const temporary = `${path}.tmp`;
  await writeFile(temporary, bytes, { flag: "w" });
  await rename(temporary, path);
};

await mkdir(outputDirectory, { recursive: true });
const games = [];
for (const group of groups.values()) {
  const list = {
    $schema: source.$schema,
    schemaVersion: source.schemaVersion,
    generatedAt: source.generatedAt,
    notice: source.notice,
    entries: group.entries,
  };
  const bytes = serialized(list);
  const digest = hash(bytes);
  await writeAtomic(resolve(outputDirectory, `${digest}.json`), bytes);
  const picks = [];
  for (const [category, configured] of Object.entries(curation.authorities?.[authorityId]?.[group.base.normalizedSha256.toUpperCase()] || {})) {
    if (!canonicalCategories.has(category)) throw new Error(`Unknown canonical category ${category}`);
    const entryId = typeof configured === "string" ? configured : configured.entryId;
    const entry = group.entries.find((candidate) => candidate.id === entryId);
    if (!entry) throw new Error(`Canonical pick ${category} references missing entry ${entryId}`);
    const pick = { category, entryId: entry.id, name: entry.name, version: entry.version };
    if (entry.output?.sha1) pick.outputSha1 = entry.output.sha1;
    picks.push(pick);
  }
  games.push({
    base: group.base,
    list: {
      documentType: "mod-registry-v1",
      url: new URL(`${digest}.json`, publicBaseUrl).href,
      sha256: digest,
      size: bytes.length,
      entryCount: group.entries.length,
      allowRedirects: false,
    },
    picks,
  });
}

games.sort((left, right) => left.base.normalizedSha256.localeCompare(right.base.normalizedSha256));
const index = {
  $schema: indexSchema,
  schemaVersion: 1,
  generatedAt: source.generatedAt,
  notice: source.notice,
  categoryDefinitions: [],
  games,
};
const indexBytes = serialized(index);
const indexDigest = hash(indexBytes);
await writeAtomic(resolve(outputDirectory, `${indexDigest}.json`), indexBytes);
console.error(JSON.stringify({
  index: `${indexDigest}.json`,
  sha256: indexDigest,
  size: indexBytes.length,
  gameCount: games.length,
  entryCount: games.reduce((total, game) => total + game.list.entryCount, 0),
}, null, 2));
