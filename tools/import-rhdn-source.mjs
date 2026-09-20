#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readSourceCapture } from "./read-source-capture.mjs";

export function importRhdnSource(capture, localMapping = { records: [] }) {
  const records = Array.isArray(capture) ? capture : capture.records;
  if (!Array.isArray(records)) throw Error("Capture must contain records");
  const local = new Map(localMapping.records.map(record => [record.projectUrl, record]));
  const groups = new Map();
  const seen = new Set();
  for (const record of records) {
    const id = /^hacks-(\d+)$/.exec(record.item || "")?.[1];
    const page = new URL(record.pageUrl);
    const download = new URL(record.downloadUrl);
    if (!id || page.origin !== "https://www.romhacking.net" || !new RegExp(`^/hacks/${id}/?$`).test(page.pathname) ||
        download.origin !== page.origin || !download.pathname.startsWith(`/download/hacks/${id}/`)) throw Error(`Mismatched source URL: ${record.item}`);
    if (seen.has(id)) throw Error(`Duplicate source item: ${id}`);
    seen.add(id);
    const game = record.fields?.Game;
    if (!game) throw Error(`Missing game: ${id}`);
    if (!groups.has(game)) groups.set(game, { name: game, entries: [] });
    const match = local.get(record.pageUrl);
    groups.get(game).entries.push({
      id: `rhdn-${id}`,
      name: record.propertyMeta?.["og:title"] || record.title,
      version: record.fields.Version || null,
      author: record.fields.Author || null,
      category: record.fields.Category || null,
      projectUrl: record.pageUrl,
      downloadUrl: record.downloadUrl,
      capturedAt: record.capturedAt,
      provenance: "source-reported",
      romInfo: record.romInfo || null,
      baseIdentity: match?.status === "sha1-matched" ? {
        sha1: match.reportedSha1,
        normalizedSha256: match.normalizedSha256,
        provenance: "local-rom-sha1-match",
      } : null,
    });
  }
  return {
    purpose: "source-download-index",
    source: "https://www.romhacking.net/",
    notice: "Source-reported game metadata and original download URLs. Patch bytes and output ROMs have not been independently verified. ROM requirements are preserved as reported.",
    entryCount: records.length,
    games: [...groups.values()].sort((a, b) => a.name.localeCompare(b.name)),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const capture = JSON.parse(await readSourceCapture(process.argv[2] || "rdhn.json"));
  const mapping = process.argv[4] ? JSON.parse(await readFile(process.argv[4], "utf8")) : undefined;
  const index = importRhdnSource(capture, mapping);
  const output = process.argv[3] || "sources/rhdn-downloads.json";
  await writeFile(output, JSON.stringify(index, null, 2) + "\n");
  console.log(`${output}: ${index.entryCount} entries across ${index.games.length} games`);
}
