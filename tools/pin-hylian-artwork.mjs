#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const inputPath = resolve(process.argv[2] || "sources/hylian-bps-registry-v1.json");
const outputPath = resolve(process.argv[3] || "sources/hylian-artwork-pins-v1.json");
const source = JSON.parse(await readFile(inputPath, "utf8"));
const maximumArtworkSize = 8 * 1024 * 1024;
const maximumMetadataSize = 1024 * 1024;
const concurrency = 6;

const sourceIdentity = (value) => {
  const normalized = structuredClone(value);
  for (const entry of normalized.entries || []) delete entry.artwork;
  return createHash("sha256").update(`${JSON.stringify(normalized)}\n`).digest("hex").toUpperCase();
};

const isImage = (bytes) =>
  bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ||
  (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ||
  bytes.subarray(0, 6).toString("ascii") === "GIF87a" ||
  bytes.subarray(0, 6).toString("ascii") === "GIF89a" ||
  bytes.subarray(0, 2).toString("ascii") === "BM";

const fetchBytes = async (url) => {
  const response = await fetch(url, {
    redirect: "manual",
    headers: { accept: "image/png,image/jpeg,image/gif,image/bmp" },
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok || response.redirected || response.url !== url.href) throw new Error(`HTTP ${response.status}`);
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && (declared < 1 || declared > maximumArtworkSize)) throw new Error(`Invalid content length ${declared}`);
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maximumArtworkSize) {
      await reader.cancel();
      throw new Error("Artwork exceeds 8 MiB");
    }
    chunks.push(value);
  }
  const bytes = Buffer.concat(chunks, size);
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") {
    throw new Error("WebP is not supported by the Bitcadia64 importer");
  }
  if (bytes.length === 0 || !isImage(bytes)) throw new Error("Unsupported image bytes");
  return bytes;
};

const readBoundedJson = async (response) => {
  const declaredHeader = response.headers.get("content-length");
  const declared = declaredHeader === null ? null : Number(declaredHeader);
  if (declared !== null && Number.isFinite(declared) && (declared < 1 || declared > maximumMetadataSize)) throw new Error(`Invalid metadata content length ${declared}`);
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maximumMetadataSize) {
      await reader.cancel();
      throw new Error("Metadata exceeds 1 MiB");
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks, size).toString("utf8"));
};

const pins = {};
const skipped = [];
let cursor = 0;
const worker = async () => {
  while (cursor < source.entries.length) {
    const entry = source.entries[cursor++];
    try {
      const metadataUrl = new URL(entry.source.metadataUrl);
      if (metadataUrl.origin !== "https://hylianmodding.com" || !metadataUrl.pathname.startsWith("/mods/") || !metadataUrl.pathname.endsWith("/mod.json")) {
        throw new Error(`Unsafe metadata locator: ${metadataUrl.href}`);
      }
      const response = await fetch(metadataUrl, { redirect: "manual", signal: AbortSignal.timeout(30000) });
      if (!response.ok || response.redirected || response.url !== metadataUrl.href) throw new Error(`Metadata HTTP ${response.status}`);
      const metadata = await readBoundedJson(response);
      const normalizedId = String(metadata.id || "").normalize("NFKC").replace(/[^A-Za-z0-9_]+/g, "");
      if (`hylian-${normalizedId}` !== entry.id || metadata.name !== entry.name || typeof metadata.thumbnail_image !== "string") throw new Error("Metadata identity or thumbnail is invalid");
      const patchUrl = new URL(metadata.download_link, metadataUrl);
      const registryPatchUrl = new URL(entry.patch.url);
      if (patchUrl.origin !== registryPatchUrl.origin || decodeURIComponent(patchUrl.pathname) !== decodeURIComponent(registryPatchUrl.pathname)) throw new Error("Metadata patch URL does not match registry entry");
      const modRoot = new URL("./", metadataUrl);
      const failures = [];
      let artworkUrl = null;
      let bytes = null;
      for (const candidate of [metadata.thumbnail_image, ...(metadata.screenshots || [])]) {
        try {
          const url = new URL(candidate, metadataUrl);
          if (url.origin !== metadataUrl.origin || !url.pathname.startsWith(`${modRoot.pathname}screenshots/`)) throw new Error(`Unsafe artwork locator: ${url.href}`);
          const fetched = await fetchBytes(url);
          artworkUrl = url;
          bytes = fetched;
          break;
        } catch (error) {
          failures.push(`${candidate}: ${error.message}`);
        }
      }
      if (!artworkUrl || !bytes) throw new Error(failures.join("; "));
      pins[entry.id] = {
        url: artworkUrl.href,
        size: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex").toUpperCase(),
        sourcePage: entry.projectUrl,
        allowRedirects: false,
      };
    } catch (error) {
      skipped.push({ entryId: entry.id, name: entry.name, error: error.message });
    }
  }
};

await Promise.all(Array.from({ length: concurrency }, worker));
const orderedPins = Object.fromEntries(Object.entries(pins).sort(([left], [right]) => left.localeCompare(right)));
skipped.sort((left, right) => left.entryId.localeCompare(right.entryId));
const document = {
  schemaVersion: 1,
  sourceRegistryGeneratedAt: source.generatedAt,
  sourceRegistrySha256: sourceIdentity(source),
  generatedAt: source.generatedAt,
  artworkCount: Object.keys(orderedPins).length,
  skipped,
  pins: orderedPins,
};
const temporary = `${outputPath}.tmp`;
await writeFile(temporary, `${JSON.stringify(document, null, 2)}\n`, { encoding: "utf8", flag: "w" });
await rename(temporary, outputPath);
console.error(`Pinned ${document.artworkCount}/${source.entries.length} Hylian artwork images at ${outputPath}; skipped ${skipped.length}`);
