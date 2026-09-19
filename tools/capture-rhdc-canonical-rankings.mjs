#!/usr/bin/env node
import { createHash } from "node:crypto";
import { writeFile, rename } from "node:fs/promises";
import { resolve } from "node:path";

const output = resolve(process.argv[2] || "sources/rhdc-canonical-rankings.json");
const pages = [];
for (const sortBy of ["downloads", "rating"]) {
  const apiUrl = `https://api.romhacking.com/v4/hacks?includePrivate=true&includeUnapproved=true&mature=no&sortBy=${sortBy}&sortOrder=desc&pageSize=25`;
  const response = await fetch(apiUrl, { redirect: "error", signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw Error(`RHDC HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const data = JSON.parse(bytes);
  if (!Array.isArray(data.results) || data.results.length !== 25) throw Error("Expected exactly 25 ranked projects");
  const seen = new Set();
  const projects = data.results.map((hack, i) => {
    if (!/^[a-f0-9]{24}$/.test(hack.hackId) || !hack.title || !hack.urlTitle || seen.has(hack.hackId)) throw Error("Invalid ranked project");
    seen.add(hack.hackId);
    return { rank: i + 1, hackId: hack.hackId, name: hack.title,
      projectUrl: `https://romhacking.com/hack/${encodeURIComponent(hack.urlTitle)}` };
  });
  pages.push({ sortBy, apiUrl, responseSha256: createHash("sha256").update(bytes).digest("hex"), projects });
}
const snapshot = { capturedAt: new Date().toISOString(), scope: "Super Mario 64 canonical picks",
  policy: "Every populated SM64 canonical slot must match a project in either top-25 list. Empty slots are permitted. Project popularity does not establish release equivalence or hardware compatibility.", pages };
await writeFile(`${output}.tmp`, JSON.stringify(snapshot, null, 2) + "\n");
await rename(`${output}.tmp`, output);
console.log(`Captured ${pages.length} top-25 lists to ${output}`);
