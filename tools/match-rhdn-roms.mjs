#!/usr/bin/env node
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function matchRoms(mapping, inventory) {
  const bySha1 = new Map();
  for (const file of inventory.files) {
    if (!/^[a-f0-9]{40}$/i.test(file.sha1) || !/^[a-f0-9]{64}$/i.test(file.sha256)) throw Error("Invalid inventory hash");
    const key = file.sha1.toUpperCase();
    if (!bySha1.has(key)) bySha1.set(key, []);
    bySha1.get(key).push(file);
  }
  const records = mapping.games.flatMap(game => game.hacks.map(hack => {
    const reported = hack.reportedRom;
    const matches = reported.sha1 ? bySha1.get(reported.sha1.toUpperCase()) || [] : [];
    let status = !reported.sha1 ? "missing-source-sha1" : !matches.length ? "no-local-sha1-match" : "sha1-matched";
    if (hack.status === "capture-review-required" || reported.issues.length) status = "source-review-required";
    else if (matches.some(file => !file.bigEndian || file.header !== "80371240")) status = "byte-order-review-required";
    else if (matches.length && new Set(matches.map(file => file.sha256.toUpperCase())).size !== 1) status = "ambiguous-local-sha256";
    else if (reported.sha256 && matches.some(file => file.sha256.toUpperCase() !== reported.sha256.toUpperCase())) status = "source-sha256-conflict";
    return {
      game: game.game, name: hack.name, projectUrl: hack.projectUrl, status,
      reportedSha1: reported.sha1, reportedSha256: reported.sha256,
      localFiles: matches.map(file => ({ name: file.name, size: file.size, sha1: file.sha1, sha256: file.sha256 })),
      normalizedSha256: status === "sha1-matched" ? matches[0].sha256.toUpperCase() : null,
    };
  }));
  return {
    purpose: "local-rhdn-base-rom-mapping",
    notice: "Exact file SHA-1 matches against source-reported ROM requirements. SHA-256 is computed locally for big-endian dumps. Patch/output compatibility still requires verification.",
    inventoryCount: inventory.files.length,
    counts: Object.fromEntries([...new Set(records.map(r => r.status))].map(status => [status, records.filter(r => r.status === status).length])),
    matchedGameCount: new Set(records.filter(r => r.status === "sha1-matched").map(r => r.game)).size,
    matchedBaseCount: new Set(records.filter(r => r.normalizedSha256).map(r => r.normalizedSha256)).size,
    records,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 5) throw Error("usage: match-rhdn-roms.mjs GAME_MAP ROM_INVENTORY OUTPUT");
  const load = async path => JSON.parse((await readFile(path, "utf8")).replace(/^\uFEFF/, ""));
  const result = matchRoms(await load(process.argv[2]), await load(process.argv[3]));
  await mkdir(dirname(resolve(process.argv[4])), { recursive: true });
  await writeFile(process.argv[4], JSON.stringify(result, null, 2) + "\n");
  console.log({ counts: result.counts, matchedGames: result.matchedGameCount, matchedBases: result.matchedBaseCount });
}
