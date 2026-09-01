#!/usr/bin/env node

import { readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sources = resolve(process.argv[2] || "sources");
const rhdcAudit = JSON.parse(await readFile(resolve(process.argv[3]), "utf8"));
const pinnedAudit = JSON.parse(await readFile(resolve(process.argv[4]), "utf8"));
const schema = "https://raw.githubusercontent.com/Bitcadia/Authority/main/schemas/mod-registry.schema.json";
const plans = [
  ["rhdc-bps-registry-v1.json", "rhdc-registry.json", rhdcAudit.identities],
  ["hylian-bps-registry-v1.json", "hylian-registry.json", pinnedAudit.identities],
  ["sm64-bps-registry-v1.json", "sm64-registry.json", pinnedAudit.identities],
  ["smashremix-registry-v1.json", "smashremix-registry.json", pinnedAudit.identities],
];

for (const [inputName, outputName, identities] of plans) {
  const source = JSON.parse(await readFile(resolve(sources, inputName), "utf8"));
  const entries = [];
  for (const original of source.entries) {
    const identity = identities[original.id];
    if (!identity) continue;
    const entry = structuredClone(original);
    if (identity.patchSize != null) entry.patch.size = identity.patchSize;
    if (identity.patchSha256 != null) entry.patch.sha256 = identity.patchSha256;
    if (!Number.isSafeInteger(entry.patch.size) || entry.patch.size < 1 || !/^[0-9A-F]{64}$/i.test(entry.patch.sha256 || "")) {
      throw new Error(`Incomplete patch identity for ${entry.id}`);
    }
    entry.output = { sha256: identity.outputSha256 };
    entries.push(entry);
  }
  if (entries.length === 0) throw new Error(`Strict registry ${outputName} is empty`);
  const document = {
    $schema: schema,
    generatedAt: source.generatedAt,
    notice: `${source.notice} Every listed patch and produced ROM is pinned by SHA-256.`,
    entries,
  };
  const output = resolve(sources, outputName);
  const temporary = `${output}.tmp`;
  await writeFile(temporary, `${JSON.stringify(document, null, 2)}\n`);
  await rename(temporary, output);
  console.error(`${outputName}: ${entries.length}/${source.entries.length} verified entries`);
}
