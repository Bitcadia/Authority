#!/usr/bin/env node

import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const apiOrigin = "https://api.romhacking.com";
const outputPath = resolve(process.argv[2] || "sources/rhdc-v4-registry-snapshot.json");
const pageSize = 100;
const delayMs = 500;
const maximumPages = 1000;
const maximumResults = 100000;
const startUrlFor = (mature) => {
  const url = new URL("/v4/hacks", apiOrigin);
  url.searchParams.set("includePrivate", "true");
  url.searchParams.set("includeUnapproved", "true");
  url.searchParams.set("mature", String(mature));
  url.searchParams.set("sortBy", "rating");
  url.searchParams.set("sortOrder", "desc");
  url.searchParams.set("pageSize", String(pageSize));
  return url;
};

const sleep = (milliseconds) => new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds));
const seenPages = new Set();
const seenHackIds = new Set();
const results = [];
const pages = [];

for (const mature of [false, true]) {
  let nextUrl = startUrlFor(mature);
  while (nextUrl) {
    if (pages.length >= maximumPages) throw new Error(`Refusing to exceed ${maximumPages} registry pages`);
    const pageKey = nextUrl.href;
    if (seenPages.has(pageKey)) throw new Error(`Repeated RHDC page: ${pageKey}`);
    seenPages.add(pageKey);

    const response = await fetch(nextUrl, {
      headers: { accept: "application/json", "user-agent": "Bitcadia-Authority-registry-backup/1.0" },
      redirect: "error",
      signal: AbortSignal.timeout(120000),
    });
    if (!response.ok) throw new Error(`RHDC returned HTTP ${response.status} for ${nextUrl.href}`);
    const page = await response.json();
    if (!page || !Array.isArray(page.results)) throw new Error(`Invalid RHDC response for ${nextUrl.href}`);
    if (page.results.length > pageSize) throw new Error(`RHDC page exceeded the requested ${pageSize} records`);

    for (const hack of page.results) {
      if (!hack || typeof hack.hackId !== "string" || hack.hackId.length === 0) throw new Error("RHDC result has no hackId");
      if (hack.mature !== mature) throw new Error(`RHDC returned the wrong maturity partition for ${hack.hackId}`);
      if (seenHackIds.has(hack.hackId)) throw new Error(`Duplicate RHDC hackId: ${hack.hackId}`);
      seenHackIds.add(hack.hackId);
      results.push(hack);
      if (results.length > maximumResults) throw new Error(`Refusing to exceed ${maximumResults} registry records`);
    }

    pages.push({
      url: nextUrl.href,
      mature,
      resultCount: page.results.length,
      bookmark: typeof page.bookmark === "string" ? page.bookmark : null,
    });
    console.error(`Captured ${results.length} hacks from ${pages.length} page(s)`);

    if (!page.next) {
      nextUrl = null;
    } else {
      const candidate = new URL(page.next, apiOrigin);
      if (candidate.origin !== apiOrigin || candidate.pathname !== "/v4/hacks" || candidate.searchParams.get("mature") !== String(mature)) {
        throw new Error(`RHDC returned an unexpected continuation URL: ${candidate.href}`);
      }
      nextUrl = candidate;
      await sleep(delayMs);
    }
  }
}

const snapshot = {
  schemaVersion: 1,
  source: {
    provider: "romhacking.com",
    apiVersion: 4,
    endpoints: [startUrlFor(false).href, startUrlFor(true).href],
    capturedAt: new Date().toISOString(),
    artifactDownloadsPerformed: false,
  },
  pageCount: pages.length,
  hackCount: results.length,
  pages,
  results,
};
const json = `${JSON.stringify(snapshot, null, 2)}\n`;
await mkdir(dirname(outputPath), { recursive: true });
const temporary = `${outputPath}.tmp`;
await writeFile(temporary, json, { encoding: "utf8", flag: "w" });
await rename(temporary, outputPath);
console.error(`Saved ${results.length} hacks to ${outputPath}`);
