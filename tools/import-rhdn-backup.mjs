#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Cartridge save settings for newly introduced base games (Mupen64Plus ROM DB).
const saveTypes = {
  NDOE: "eeprom16k", NDME: "none", NDZE: "none", NGEE: "eeprom4k",
  NKTE: "eeprom4k", NPDE: "eeprom16k", NP3E: "flashram", NSVE: "eeprom4k",
};
export function importBackup(report, existing) {
  const bases = new Map(existing.map(entry => [entry.base.normalizedSha256.toLowerCase(), entry.base]));
  const saves = new Map(existing.filter(entry => entry.saveType).map(entry => [entry.base.normalizedSha256.toLowerCase(), entry.saveType]));
  const identity = entry => `${entry.base.normalizedSha256.toLowerCase()}:${entry.output.sha256.toLowerCase()}`;
  const seen = new Set(existing.map(identity));
  const entries = [];
  const duplicates = [];
  for (const record of report.verified) {
    if (record.verification !== "two-client-decoder-runs-and-client-zip-extraction") throw Error("Missing client verification evidence");
    if (seen.has(identity(record))) {
      duplicates.push({ id: record.id, outputSha256: record.output.sha256 });
      continue;
    }
    const digest = record.base.normalizedSha256.toLowerCase();
    const base = bases.get(digest) || {
      name: record.game,
      variant: record.base.filename.replace(/\.z64$/i, ""),
      gameCode: record.base.gameCode,
      normalizedCrc32: record.base.normalizedCrc32,
      normalizedSha256: digest,
    };
    const saveType = saves.get(digest) || (base.name === "Super Mario 64" ? "eeprom4k" : saveTypes[base.gameCode]);
    if (!saveType) throw Error(`Missing save type: ${record.id}`);
    const artifact = report.artifacts[record.patch.sha256];
    if (!artifact || artifact.url !== record.patch.url || artifact.size !== record.patch.size || artifact.archiveMember !== record.archiveMember) throw Error("Missing public archive identity");
    const url = new URL(record.patch.url);
    if (url.protocol !== "https:" || !url.hostname.endsWith(".archive.org")) throw Error("Unexpected archive URL");
    const suffix = record.patch.archiveMember.split("/").pop().replace(/\.(bps|xdelta|vcdiff)$/i, "");
    const name = `${record.name} - ${suffix}`.replace(/[,\r\n]/g, " ").slice(0, 128).trim();
    const version = record.version.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, "");
    if (!version || version.length > 64) throw Error(`Invalid archive version: ${record.id}`);
    entries.push({
      id: record.id, name, version, authors: [...new Set(record.authors.filter(Boolean))],
      projectUrl: record.projectUrl,
      source: { provider: "romhacking.net (2021-09-14 archive)", metadataUrl: "https://archive.org/details/rhdn-20210914", retrievedAt: "2021-09-14T00:00:00Z" },
      base, patch: record.patch, output: record.output,
      compatibility: "patch-applied-not-playtested", saveType,
      rights: { patchRedistributionAllowed: false, artworkRedistributionAllowed: false },
    });
    seen.add(identity(record));
    bases.set(digest, base);
  }
  return { registry: {
    $schema: "https://raw.githubusercontent.com/Bitcadia/Authority/main/schemas/mod-registry.schema.json",
    generatedAt: "2021-09-14T00:00:00Z",
    notice: "Archived RHDN patch releases, reproduced with Bitcadia64 decoders. Public archive bytes and ZIP members are pinned. No ROM or patch bytes redistributed by Authority; gameplay not tested.",
    entries,
  }, duplicates };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = JSON.parse(await readFile(process.argv[2], "utf8"));
  const existing = (await Promise.all(["rhdc", "hylian", "sm64", "smashremix", "plaza"].map(async name => JSON.parse(await readFile(new URL(`../sources/${name}-registry.json`, import.meta.url)))))).flatMap(d => d.entries);
  const { registry, duplicates } = importBackup(report, existing);
  await writeFile(new URL("../sources/rhdn-registry.json", import.meta.url), JSON.stringify(registry, null, 2) + "\n");
  await writeFile(new URL("../sources/rhdn-backup-verification.json", import.meta.url), JSON.stringify({ ...report, duplicates, publishedEntries: registry.entries.length }, null, 2) + "\n");
  console.log({ entries: registry.entries.length, games: new Set(registry.entries.map(e => e.base.name)).size, duplicates: duplicates.length });
}
