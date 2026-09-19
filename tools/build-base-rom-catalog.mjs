#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";

const sourcePath = resolve(process.argv[2] || "sources/rhdc-registry.json");
const outputDirectory = resolve(process.argv[3] || "sites/rhdc/catalog");
const publicBaseUrl = process.argv[4] || "https://raw.githubusercontent.com/Bitcadia/Authority/main/sites/rhdc/catalog/";
const picksPath = resolve(process.argv[5] || "sources/canonical-picks.json");
const authorityId = process.argv[6] || basename(dirname(outputDirectory));
const source = JSON.parse(await readFile(sourcePath, "utf8"));
const outputSizes = JSON.parse(await readFile(new URL("../sources/output-sizes.json", import.meta.url)));
const exclusions = JSON.parse(await readFile(new URL("../sources/publication-exclusions.json", import.meta.url)));
const releaseGroups = JSON.parse(await readFile(new URL("../sources/release-groups.json", import.meta.url)));
const curation = JSON.parse(await readFile(picksPath, "utf8"));
const recommendations = JSON.parse(await readFile(new URL("../sources/rhdc-recommendations.json", import.meta.url)));
const recommendationCategories = recommendations.pages.filter(page => page.projects.some(project => project.entries[authorityId]?.length));
const indexSchema = "https://raw.githubusercontent.com/Bitcadia/Authority/main/schemas/mod-registry-index.schema.json";
const canonicalCategories = new Set(["the-sequel", "the-dlc", "the-replacement", "the-experiment", "the-preserver"]);
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object"
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const digestEntry = value => createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
const groups = new Map();

for (const original of source.entries || []) {
  if (exclusions[original.id]) continue;
  const entry = structuredClone(original);
  if (releaseGroups[entry.id]) Object.assign(entry, releaseGroups[entry.id]);
  entry.base.normalizedSha256 = entry.base.normalizedSha256.toLowerCase();
  for (const key of ["sha256", "memberSha256"]) if (entry.patch[key]) entry.patch[key] = entry.patch[key].toLowerCase();
  entry.output.sha256 = entry.output.sha256.toLowerCase();
  if (!entry.output.size) {
    const evidence = outputSizes[entry.id];
    if (!evidence || evidence.patchSha256.toLowerCase() !== entry.patch.sha256) throw Error(`Missing output-size evidence: ${entry.id}`);
    entry.output.size = evidence.size;
  }
  if (!entry.saveType && entry.base.name === "Super Mario 64") entry.saveType = "eeprom4k";
  if (!Number.isSafeInteger(entry.output.size) || entry.output.size < 1) throw Error(`Missing output size: ${entry.id}`);
  if (entry.artwork) entry.artwork.sha256 = entry.artwork.sha256.toLowerCase();
  entry.recipe = { type: "apply-rom-patch", input: { type: "base-rom" } };
  delete entry.entrySha256;
  entry.entrySha256 = digestEntry(entry);
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
    schemaVersion: 2,
    listId: `${authorityId}-${group.base.normalizedSha256.slice(0, 16)}`,
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
    const pick = { category, entryId: entry.id, entrySha256: entry.entrySha256, name: entry.name, version: entry.version, outputSha256: entry.output.sha256 };
    picks.push(pick);
  }
  for (const page of recommendationCategories) for (const project of page.projects) {
    for (const entryId of project.entries[authorityId] || []) {
      const entry = group.entries.find(candidate => candidate.id === entryId);
      if (!entry) {
        if (![...groups.values()].some(candidate => candidate.entries.some(value => value.id === entryId)))
          throw Error(`RHDC recommendation references missing entry ${authorityId}:${entryId}`);
        continue;
      }
      picks.push({ category: page.category, entryId: entry.id, entrySha256: entry.entrySha256,
        name: entry.name, version: entry.version, outputSha256: entry.output.sha256 });
    }
  }
  games.push({
    base: group.base,
    list: {
      documentType: "mod-registry",
      url: new URL(`${digest}.json`, publicBaseUrl).href,
      sha256: digest,
      size: bytes.length,
      entryCount: group.entries.length,
      allowRedirects: false,
    },
    targets: [{ target: { type: "base-rom", normalizedSha256: group.base.normalizedSha256 }, picks }],
  });
}

games.sort((left, right) => left.base.normalizedSha256.localeCompare(right.base.normalizedSha256));
const index = {
  $schema: indexSchema,
  schemaVersion: 2,
  generatedAt: source.generatedAt,
  notice: source.notice,
  categoryDefinitions: recommendationCategories.map(page => ({ id: page.category, label: page.label, description: page.description })),
  games,
};
const indexBytes = serialized(index);
const indexDigest = hash(indexBytes);
await writeAtomic(resolve(outputDirectory, `${indexDigest}.json`), indexBytes);
console.log(JSON.stringify({
  index: `${indexDigest}.json`,
  sha256: indexDigest,
  size: indexBytes.length,
  gameCount: games.length,
  entryCount: games.reduce((total, game) => total + game.list.entryCount, 0),
}, null, 2));
