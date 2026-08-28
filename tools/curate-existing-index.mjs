#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";

const indexPath = resolve(process.argv[2]);
const picksPath = resolve(process.argv[3] || "sources/canonical-picks-v1.json");
const authorityId = process.argv[4] || basename(dirname(dirname(indexPath)));
if (!process.argv[2]) throw new Error("Usage: node tools/curate-existing-index.mjs <index.json> [picks.json]");

const canonicalBytes = (bytes) => Buffer.from(bytes.toString("utf8").replaceAll("\r\n", "\n"), "utf8");
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const index = JSON.parse(await readFile(indexPath, "utf8"));
const curation = JSON.parse(await readFile(picksPath, "utf8"));
const canonicalCategories = new Set(["the-sequel", "the-dlc", "the-replacement", "the-experiment"]);

for (const game of index.games || []) {
  const listName = basename(new URL(game.list.url).pathname);
  const listBytes = canonicalBytes(await readFile(resolve(dirname(indexPath), listName)));
  if (digest(listBytes) !== game.list.sha256 || listBytes.length !== game.list.size) {
    throw new Error(`Existing index has invalid list pins for ${listName}`);
  }
  const list = JSON.parse(listBytes);
  if (list.entries.length !== game.list.entryCount) throw new Error(`Existing index has an invalid entry count for ${listName}`);
  const configured = curation.authorities?.[authorityId]?.[game.base.normalizedSha256.toUpperCase()] || {};
  game.picks = [];
  for (const [category, selection] of Object.entries(configured)) {
    if (!canonicalCategories.has(category)) throw new Error(`Unknown canonical category ${category}`);
    const entryId = typeof selection === "string" ? selection : selection.entryId;
    const entry = list.entries.find((candidate) => candidate.id === entryId);
    if (!entry) throw new Error(`Canonical pick ${category} references missing entry ${entryId}`);
    const pick = { category, entryId: entry.id, name: entry.name, version: entry.version };
    if (entry.output?.sha1) pick.outputSha1 = entry.output.sha1;
    game.picks.push(pick);
  }
}

const output = Buffer.from(`${JSON.stringify(index)}\n`, "utf8");
const outputName = `${digest(output)}.json`;
const outputPath = resolve(dirname(indexPath), outputName);
const temporary = `${outputPath}.tmp`;
await writeFile(temporary, output, { flag: "w" });
await rename(temporary, outputPath);
console.error(JSON.stringify({ index: outputName, sha256: digest(output), size: output.length, gameCount: index.games.length }, null, 2));
