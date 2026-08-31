#!/usr/bin/env node

import { rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const outputPath = resolve(process.argv[2] || "sources/hylian-registry-snapshot-v1.json");
const indexUrl = new URL("https://hylianmodding.com/mods/index.json");
const indexResponse = await fetch(indexUrl, { redirect: "manual", signal: AbortSignal.timeout(30000) });
if (!indexResponse.ok || indexResponse.redirected || indexResponse.url !== indexUrl.href) throw new Error(`Index fetch failed: HTTP ${indexResponse.status}`);
const readBounded = async (response, maximum) => {
  const declaredHeader = response.headers.get("content-length");
  const declared = declaredHeader === null ? null : Number(declaredHeader);
  if (declared !== null && Number.isFinite(declared) && (declared < 1 || declared > maximum)) throw new Error(`Invalid content length ${declared}`);
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maximum) { await reader.cancel(); throw new Error(`Response exceeds ${maximum} bytes`); }
    chunks.push(value);
  }
  return Buffer.concat(chunks, size);
};
const indexBytes = await readBounded(indexResponse, 1024 * 1024);
if (indexBytes.length === 0 || indexBytes.length > 1024 * 1024) throw new Error("Invalid Hylian index size");
const inventory = JSON.parse(indexBytes.toString("utf8"));
if (!Array.isArray(inventory.mods) || inventory.mods.length === 0) throw new Error("Invalid Hylian inventory");
if (inventory.mods.length > 1000) throw new Error("Hylian inventory exceeds 1000 records");
if (new Set(inventory.mods).size !== inventory.mods.length) throw new Error("Duplicate Hylian inventory ID");

const records = [];
let totalMetadataBytes = indexBytes.length;
for (const id of inventory.mods) {
  if (typeof id !== "string" || !/^[a-z0-9_']+$/.test(id)) throw new Error(`Invalid Hylian mod ID: ${id}`);
  const url = new URL(`/mods/${encodeURIComponent(id)}/mod.json`, "https://hylianmodding.com/");
  const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(30000) });
  if (!response.ok || response.redirected || response.url !== url.href) throw new Error(`Metadata fetch failed for ${id}: HTTP ${response.status}`);
  const bytes = await readBounded(response, 1024 * 1024);
  totalMetadataBytes += bytes.length;
  if (totalMetadataBytes > 64 * 1024 * 1024) throw new Error("Hylian metadata capture exceeds 64 MiB");
  if (bytes.length === 0 || bytes.length > 1024 * 1024) throw new Error(`Invalid metadata size for ${id}`);
  const metadata = JSON.parse(bytes.toString("utf8"));
  if (metadata.id !== id) throw new Error(`Metadata ID mismatch for ${id}: ${metadata.id}`);
  records.push({ metadataUrl: url.href, metadata });
}

const snapshot = {
  schemaVersion: 1,
  source: {
    provider: "hylianmodding.com",
    indexUrl: indexUrl.href,
    capturedAt: new Date().toISOString(),
    artifactDownloadsPerformed: false
  },
  modCount: records.length,
  records
};
const temporary = `${outputPath}.tmp`;
await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`, { encoding: "utf8", flag: "w" });
await rename(temporary, outputPath);
console.error(`Captured ${records.length} Hylian metadata records at ${outputPath}`);
