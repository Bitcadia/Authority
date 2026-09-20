#!/usr/bin/env node
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readSourceCapture } from "./read-source-capture.mjs";

// Invalid descriptions in browser exports must not prevent a planning-only map.
// Recovery reads individually valid JSON string fields, never evaluates input.
export function mapCapture(text, registries = []) {
  let records;
  let parseError = null;
  try { const parsed = JSON.parse(text); records = Array.isArray(parsed) ? parsed : parsed.records; }
  catch (error) {
    parseError = error.message;
    const section = text.slice(text.indexOf('"records": ['));
    const blocks = section.split(/\n        \{\s*\n/).slice(1);
    records = blocks.map(block => {
      const field = name => {
        const line = block.split("\n").find(value => value.trimStart().startsWith(`${JSON.stringify(name)}:`));
        if (!line) return null;
        try { return JSON.parse(line.trimStart().slice(JSON.stringify(name).length + 1).trim().replace(/,$/, "")); }
        catch { return null; }
      };
      return { pageUrl: field("pageUrl"), item: field("item"), meta: { id: field("id") },
        propertyMeta: { "og:url": field("og:url"), "og:title": field("og:title") },
        fields: { Game: field("Game"), Platform: field("Platform"), Version: field("Version") } };
    });
  }
  if (!Array.isArray(records) || !records.length) throw Error("No capture records");
  const normalize = value => value.toLowerCase().replace(/^the\s+/, "").replace(/[^a-z0-9]/g, "");
  const candidates = new Map();
  for (const registry of registries) for (const entry of registry.entries) {
    const key = normalize(entry.base.name);
    if (!candidates.has(key)) candidates.set(key, new Map());
    candidates.get(key).set(entry.base.normalizedSha256, entry.base);
  }
  const groups = new Map();
  const seen = new Set();
  const issues = [];
  const urlId = url => /^https:\/\/(?:www\.)?romhacking\.net\/hacks\/(\d+)\/$/.exec(url || "")?.[1];
  records.forEach((r, index) => {
    const itemId = /^hacks-(\d+)$/.exec(r.item || "")?.[1];
    const metaId = /^hacks-(\d+)$/.exec(r.meta?.id || "")?.[1];
    const canonicalId = urlId(r.propertyMeta?.["og:url"]);
    const pageId = urlId(r.pageUrl);
    const problems = [];
    if (!itemId || itemId !== metaId || itemId !== canonicalId) problems.push("conflicting-or-missing-content-identity");
    if (pageId !== canonicalId) problems.push("requested-page-does-not-match-captured-content");
    if (!r.fields?.Game || r.fields?.Platform !== "Nintendo 64") problems.push("missing-game-or-wrong-platform");
    if (seen.has(itemId)) problems.push("duplicate-captured-item");
    if (itemId) seen.add(itemId);
    if (problems.length) issues.push({ record: index + 1, requestedPageUrl: r.pageUrl, capturedItem: r.item, problems });
    const game = r.fields?.Game;
    if (!game) return;
    const hashIssues = [];
    const hashes = {};
    for (const [name, label, length] of [["sha1", "SHA-1", 40], ["sha256", "SHA-256", 64], ["crc32", "CRC32", 8], ["md5", "MD5", 32]]) {
      const values = [r.romInfo?.[name], r.romInfo?.fields?.[`File/ROM ${label}`], r.romInfo?.fields?.[label]]
        .filter(value => value != null && value !== "");
      const valid = [...new Set(values.filter(value => typeof value === "string" && new RegExp(`^[a-f0-9]{${length}}$`, "i").test(value.trim())).map(value => value.trim().toUpperCase()))];
      if (values.length && (valid.length !== 1 || values.some(value => typeof value !== "string" || !new RegExp(`^[a-f0-9]{${length}}$`, "i").test(value.trim())))) hashIssues.push(`invalid-or-conflicting-${name}`);
      hashes[name] = valid.length === 1 && !hashIssues.includes(`invalid-or-conflicting-${name}`) ? valid[0] : null;
    }
    const gameBases = [...(candidates.get(normalize(game))?.values() || [])];
    const matchingBase = hashes.sha256 ? gameBases.find(base => base.normalizedSha256.toUpperCase() === hashes.sha256) : null;
    if (matchingBase && hashes.crc32 && hashes.crc32 !== matchingBase.normalizedCrc32?.toUpperCase()) hashIssues.push("known-base-crc32-conflict");
    if (!groups.has(game)) groups.set(game, { game, knownBaseCandidates: [...(candidates.get(normalize(game))?.values() || [])], hacks: [] });
    groups.get(game).hacks.push({ record: index + 1, name: r.propertyMeta?.["og:title"], version: r.fields?.Version,
      projectUrl: canonicalId ? `https://www.romhacking.net/hacks/${canonicalId}/` : null,
      capturedItem: r.item, status: problems.length ? "capture-review-required" : "game-mapped-base-unverified",
      reportedRom: { ...hashes, databaseMatch: r.romInfo?.databaseMatch || null, database: r.romInfo?.database || null,
        fields: r.romInfo?.fields || {}, text: r.romInfo?.text || null, issues: hashIssues },
      baseMapping: {
        status: problems.length || hashIssues.length ? "review-required" : matchingBase ? "source-reported-sha256-match" : "unresolved",
        knownBase: !problems.length && !hashIssues.length ? matchingBase || null : null,
      } });
  });
  return { purpose: "rhdn-game-mapping", notice: "Planning only. Base candidates are title matches, not verified patch requirements. No download authorization.",
    inputJsonValid: parseError === null, inputParseError: parseError, recordCount: records.length,
    uniqueCapturedItems: seen.size, gameCount: groups.size, issues,
    games: [...groups.values()].sort((a, b) => a.game.localeCompare(b.game)) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const input = resolve(process.argv[2] || "rdhn.json");
  const output = resolve(process.argv[3] || "scratch/rhdn-game-map.json");
  const registries = await Promise.all(["rhdc", "hylian", "sm64", "smashremix"].map(async name => JSON.parse(await readFile(new URL(`../sources/${name}-registry.json`, import.meta.url)))));
  const result = mapCapture(await readSourceCapture(input), registries);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify({ output, records: result.recordCount, games: result.gameCount, uniqueItems: result.uniqueCapturedItems, captureIssues: result.issues.length, inputJsonValid: result.inputJsonValid }));
}
