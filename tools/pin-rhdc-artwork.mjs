#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const inputPath = resolve(process.argv[2] || "sources/rhdc-v4-registry-snapshot.json");
const outputPath = resolve(process.argv[3] || "sources/rhdc-artwork-pins-v1.json");
const snapshot = JSON.parse(await readFile(inputPath, "utf8"));
const maximumArtworkSize = 8 * 1024 * 1024;
const concurrency = 12;
const publisherArtworkFallbacks = {
  "66490950139c2f67916c660e": {
    video: "https://www.youtube.com/embed/VTSP1ov2QYM",
    url: "https://i.ytimg.com/vi/VTSP1ov2QYM/maxresdefault.jpg",
    sourcePage: "https://www.youtube.com/watch?v=VTSP1ov2QYM",
  },
};

const directBpsHacks = snapshot.results.filter((hack) => {
  const version = [...(hack.versions || [])].reverse().find((candidate) => candidate.approved && !candidate.archived);
  return version?.download?.mimeType === "application/x-bps-patch";
});

const isImage = (bytes) =>
  bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ||
  (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ||
  bytes.subarray(0, 6).toString("ascii") === "GIF87a" ||
  bytes.subarray(0, 6).toString("ascii") === "GIF89a" ||
  bytes.subarray(0, 2).toString("ascii") === "BM";

const fetchCandidate = async (href, expectedOrigin = "https://api.romhacking.com", expectedPathPrefix = "/game/") => {
  const url = new URL(href, "https://api.romhacking.com/");
  if (url.origin !== expectedOrigin || !url.pathname.startsWith(expectedPathPrefix)) throw new Error(`Unsafe artwork locator: ${href}`);
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
  if (bytes.length === 0 || !isImage(bytes)) throw new Error("Unsupported image bytes");
  return {
    url: url.href,
    size: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex").toUpperCase(),
    allowRedirects: false,
  };
};

const pins = {};
const skipped = [];
let cursor = 0;
const worker = async () => {
  while (cursor < directBpsHacks.length) {
    const hack = directBpsHacks[cursor++];
    let artwork = null;
    let sourcePage = `https://romhacking.com/hack/${encodeURIComponent(hack.urlTitle)}`;
    const failures = [];
    for (const screenshot of hack.screenshots || []) {
      if (screenshot.secured) continue;
      try {
        artwork = await fetchCandidate(screenshot.directHref);
        break;
      } catch (error) {
        failures.push(`${screenshot.directHref}: ${error.message}`);
      }
    }
    const fallback = publisherArtworkFallbacks[hack.hackId];
    if (!artwork && fallback && (hack.videos || []).includes(fallback.video)) {
      try {
        const videoId = new URL(fallback.video).pathname.split("/").pop();
        artwork = await fetchCandidate(fallback.url, "https://i.ytimg.com", `/vi/${videoId}/`);
        sourcePage = fallback.sourcePage;
      } catch (error) {
        failures.push(`${fallback.url}: ${error.message}`);
      }
    }
    if (artwork) {
      pins[hack.hackId] = {
        ...artwork,
        sourcePage,
      };
    } else {
      skipped.push({ hackId: hack.hackId, title: hack.title, failures });
    }
    if ((Object.keys(pins).length + skipped.length) % 100 === 0) console.error(`Pinned ${Object.keys(pins).length}/${directBpsHacks.length}`);
  }
};

await Promise.all(Array.from({ length: concurrency }, worker));
const orderedPins = Object.fromEntries(Object.entries(pins).sort(([left], [right]) => left.localeCompare(right)));
skipped.sort((left, right) => left.hackId.localeCompare(right.hackId));
const document = {
  schemaVersion: 1,
  sourceSnapshotCapturedAt: snapshot.source.capturedAt,
  generatedAt: new Date().toISOString(),
  artworkCount: Object.keys(orderedPins).length,
  skipped,
  pins: orderedPins,
};
const temporary = `${outputPath}.tmp`;
await writeFile(temporary, `${JSON.stringify(document, null, 2)}\n`, { encoding: "utf8", flag: "w" });
await rename(temporary, outputPath);
console.error(`Pinned ${document.artworkCount}/${directBpsHacks.length} RHDC artwork images at ${outputPath}; skipped ${skipped.length}`);
