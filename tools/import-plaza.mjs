#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";

const load = async path => JSON.parse((await readFile(path, "utf8")).replace(/^\uFEFF/, ""));
const capture = await load(process.argv[2] || "scratch/plaza-capture.json");
const inventory = process.argv[3] ? await load(process.argv[3]) : { files: [] };
const rhdn = process.argv[4] ? await load(process.argv[4]) : { games: [] };
if (!capture.complete || capture.errors.length || capture.records.length !== capture.listing.length) throw Error("Incomplete Plaza capture");
const normalize = text => text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const rhdnEntries = rhdn.games.flatMap(game => game.entries.map(entry => ({ ...entry, game: game.name })));
const entries = capture.records.map(({ id, detail, downloads }) => {
  if (detail.id !== id || detail.platform.id !== 5 || detail.type !== "romhacks") throw Error("Entry identity/platform mismatch");
  const candidates = rhdnEntries.filter(entry => normalize(entry.name) === normalize(detail.title) && normalize(entry.game) === normalize(detail.game.name));
  return {
    id: `plaza-${id}`, name: detail.title, game: detail.game.name, version: detail.version,
    authors: detail.authors.map(a => a.name),
    projectUrl: `https://romhackplaza.org/${detail.type}/${detail.slug}`,
    provenance: "source-reported", capturedAt: capture.capturedAt,
    downloads: downloads.map(file => {
      const url = new URL(file.download);
      if (url.origin !== "https://romhackplaza.org" || !Number.isSafeInteger(file.filesize) || file.filesize < 1) throw Error("Invalid download metadata");
      return { filename: file.filename, size: file.filesize, downloadUrl: file.download, fileId: file.file_uuid };
    }),
    reportedBases: detail.hashes.map(hash => {
      const sha1 = hash.hash_sha1?.toUpperCase() || null;
      const matches = /^[A-F0-9]{40}$/.test(sha1 || "") ? inventory.files.filter(file => file.bigEndian && file.header === "80371240" && file.sha1.toUpperCase() === sha1) : [];
      const digests = [...new Set(matches.map(file => file.sha256.toUpperCase()))];
      return { filename: hash.filename, sha1, crc32: hash.hash_crc32?.toUpperCase() || null, database: hash.verified,
        normalizedSha256: digests.length === 1 ? digests[0] : null, mapping: digests.length === 1 ? "local-rom-sha1-match" : "unresolved" };
    }),
    rhdnCandidates: candidates.map(entry => ({ id: entry.id, projectUrl: entry.projectUrl, version: entry.version,
      match: normalize(String(entry.version)) === normalize(String(detail.version)) && detail.authors.some(author => normalize(author.name) === normalize(entry.author || ""))
        ? "title-game-author-version" : "title-game-only-review-required" })),
  };
});
const output = process.argv[5] || "sources/plaza-downloads.json";
await writeFile(output, JSON.stringify({ purpose: "source-download-index", source: "https://romhackplaza.org/", notice: "Site-reported download metadata. Sizes describe downloadable files, which may be archives. Patch and output hashes are not inferred. RHDN candidates do not automatically replace release URLs.", entryCount: entries.length, entries }, null, 2) + "\n");
console.log({ entries: entries.length, games: new Set(entries.map(e => e.game)).size,
  downloadFiles: entries.reduce((n, e) => n + e.downloads.length, 0),
  entriesWithLocalBases: entries.filter(e => e.reportedBases.some(b => b.normalizedSha256)).length,
  rhdnTitleMatches: entries.filter(e => e.rhdnCandidates.length).length,
  rhdnReleaseMatches: entries.filter(e => e.rhdnCandidates.some(c => c.match === "title-game-author-version")).length });
