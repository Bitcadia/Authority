#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { basename, resolve } from "node:path";

const directory = resolve(process.argv[2] || "sites/rhdc/catalog");
const names = (await readdir(directory)).filter((name) => name.endsWith(".json"));
const documents = new Map();

for (const name of names) {
  const workingBytes = await readFile(resolve(directory, name));
  const normalizedBytes = Buffer.from(workingBytes.toString("utf8").replaceAll("\r\n", "\n"), "utf8");
  const rawDigest = createHash("sha256").update(workingBytes).digest("hex");
  const normalizedDigest = createHash("sha256").update(normalizedBytes).digest("hex");
  const bytes = name === `${rawDigest}.json` ? workingBytes : normalizedBytes;
  const digest = name === `${rawDigest}.json` ? rawDigest : normalizedDigest;
  if (name !== `${digest}.json`) throw new Error(`Content-address mismatch: ${name}`);
  documents.set(name, { bytes, value: JSON.parse(bytes) });
}

let indexes = 0;
let lists = 0;
let entries = 0;
for (const [name, document] of documents) {
  if (Array.isArray(document.value.entries)) {
    lists += 1;
    entries += document.value.entries.length;
    const bases = new Set(document.value.entries.map((entry) => entry.base.normalizedSha256.toUpperCase()));
    if (bases.size !== 1) throw new Error(`List ${name} mixes normalized base ROMs`);
    continue;
  }
  if (!Array.isArray(document.value.games)) throw new Error(`Unknown catalog document: ${name}`);
  indexes += 1;
  const bases = new Set();
  for (const game of document.value.games) {
    const key = game.base.normalizedSha256.toUpperCase();
    if (bases.has(key)) throw new Error(`Index ${name} repeats base ${key}`);
    bases.add(key);
    const listName = basename(new URL(game.list.url).pathname);
    const list = documents.get(listName) || (() => { throw new Error(`Missing list ${listName}`); })();
    const digest = createHash("sha256").update(list.bytes).digest("hex");
    if (digest !== game.list.sha256 || list.bytes.length !== game.list.size || list.value.entries.length !== game.list.entryCount) {
      throw new Error(`Index ${name} has invalid pins for ${listName}`);
    }
    for (const entry of list.value.entries) {
      if (entry.base.normalizedSha256.toUpperCase() !== key
        || entry.base.normalizedCrc32.toUpperCase() !== game.base.normalizedCrc32.toUpperCase()) {
        throw new Error(`List ${listName} does not match its index base`);
      }
    }
    const categories = new Set();
    for (const pick of game.picks || []) {
      if (categories.has(pick.category)) throw new Error(`Index ${name} repeats canonical category ${pick.category}`);
      categories.add(pick.category);
      const entry = list.value.entries.find((candidate) => candidate.id === pick.entryId);
      if (!entry) throw new Error(`Index ${name} pick references missing entry ${pick.entryId}`);
      if (entry.name !== pick.name || entry.version !== pick.version) throw new Error(`Index ${name} pick metadata does not match ${pick.entryId}`);
      if (pick.outputSha1 && entry.output?.sha1?.toUpperCase() !== pick.outputSha1.toUpperCase()) {
        throw new Error(`Index ${name} pick output does not match ${pick.entryId}`);
      }
    }
  }
}

console.error(JSON.stringify({ files: names.length, indexes, lists, entries }, null, 2));
