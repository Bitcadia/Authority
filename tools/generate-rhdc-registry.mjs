#!/usr/bin/env node

import { readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const inputPath = resolve(process.argv[2] || "sources/rhdc-v4-registry-snapshot.json");
const outputPath = resolve(process.argv[3] || "sources/rhdc-registry.json");
const artworkPath = resolve(process.argv[4] || "sources/rhdc-artwork-pins-v1.json");
const identitiesPath = resolve(process.argv[5] || "sources/rhdc-artifact-identities.json");
const snapshot = JSON.parse(await readFile(inputPath, "utf8"));
const artwork = JSON.parse(await readFile(artworkPath, "utf8"));
const identities = JSON.parse(await readFile(identitiesPath, "utf8")).identities;
if (artwork.sourceSnapshotCapturedAt !== snapshot.source.capturedAt) throw new Error("Artwork pins were generated from a different RHDC snapshot");
const schema = "https://raw.githubusercontent.com/Bitcadia/Authority/main/schemas/mod-registry.schema.json";
const base = {
  name: "Super Mario 64",
  variant: "USA",
  gameCode: "NSME",
  normalizedCrc32: "3CE60709",
  normalizedSha256: "17CE077343C6133F8C9F2D6D6D9A4AB62C8CD2AA57C40AEA1F490B4C8BB21D91",
};
const expectedUpstreamBase = {
  gameCode: "SM",
  gameName: "Super Mario 64",
  variant: "US Version",
  crc32: 1021708041,
};

const versionFrom = (fileName, patchedSha1) => {
  const stem = fileName.normalize("NFKC").replace(/\.bps$/i, "").trim();
  const explicit = [...stem.matchAll(/(?:^|[\s_.([\-])(?:version[\s_.-]*|ver[\s_.-]*|v)([0-9]+(?:\.[0-9A-Za-z]+)*(?:[-_][0-9A-Za-z]+)*)/gi)]
    .map((match) => match[1]);
  if (explicit.length === 1) return explicit[0].replaceAll("_", "-");
  const dotted = [...stem.matchAll(/(?:^|[^0-9A-Za-z])([0-9]+(?:\.[0-9A-Za-z]+)+)(?=$|[^0-9A-Za-z])/g)]
    .map((match) => match[1]);
  if (explicit.length === 0 && dotted.length === 1) return dotted[0];
  return `sha1-${patchedSha1.toLowerCase()}`;
};

const compatibilityFrom = (value) => value ? `rhdc-${value.toLowerCase()}` : "unverified";
const entries = [];
for (const hack of snapshot.results) {
  const version = [...(hack.versions || [])].reverse().find((candidate) => candidate.approved && !candidate.archived);
  if (!version || version.download?.mimeType !== "application/x-bps-patch") continue;
  for (const [field, expected] of Object.entries(expectedUpstreamBase)) {
    if (hack.baseRom?.[field] !== expected) throw new Error(`Unexpected base ROM ${field} for ${hack.hackId}`);
  }
  if (!/^[0-9a-f]{40}$/i.test(version.patchedSha1 || "")) throw new Error(`Invalid output SHA-1 for ${hack.hackId}`);
  const patchUrl = new URL(version.download.directHref, "https://api.romhacking.com/");
  if (patchUrl.origin !== "https://api.romhacking.com" || !patchUrl.pathname.startsWith("/game/") || version.download.secured) {
    throw new Error(`Unsafe patch locator for ${hack.hackId}`);
  }
  const release = versionFrom(version.download.fileName, version.patchedSha1);
  const slug = encodeURIComponent(hack.urlTitle);
  const entry = {
    id: `rhdc-${hack.hackId}-${release}`,
    name: hack.title.trim().replaceAll(",", ";"),
    version: release,
    authors: (hack.authors || []).map((author) => author.username.trim()),
    projectUrl: `https://romhacking.com/hack/${slug}`,
    source: {
      provider: "rhdc",
      metadataUrl: `https://api.romhacking.com/v3/hacks/hack/${encodeURIComponent(hack.urlTitle.toLowerCase())}`,
      retrievedAt: snapshot.source.capturedAt,
    },
    base,
    patch: {
      format: "bps",
      url: patchUrl.href,
      size: 0,
      sha256: "",
      allowRedirects: false,
    },
    output: { sha256: "" },
    compatibility: compatibilityFrom(version.consoleCompatibility),
    rights: {
      patchRedistributionAllowed: false,
      artworkRedistributionAllowed: false,
    },
  };
  const identity = identities[entry.id];
  if (!identity) continue;
  if (identity.url !== entry.patch.url) throw new Error(`Artifact identity URL changed for ${entry.id}`);
  entry.patch.size = identity.patchSize;
  entry.patch.sha256 = identity.patchSha256;
  entry.output.sha256 = identity.outputSha256;
  if (artwork.pins[hack.hackId]) entry.artwork = artwork.pins[hack.hackId];
  entries.push(entry);
}

const ids = new Set();
for (const entry of entries) {
  if (ids.has(entry.id)) throw new Error(`Duplicate generated entry ID: ${entry.id}`);
  ids.add(entry.id);
}
const registry = {
  $schema: schema,
  generatedAt: snapshot.source.capturedAt,
  notice: "Metadata-only backup of verified direct BPS releases indexed by Romhacking.com. Bitcadia does not redistribute patch or ROM bytes. Every listed patch and produced ROM is pinned by SHA-256.",
  entries,
};
const retainedArtworkCount = Object.keys(identities).filter((id) => {
  const hackId = entries.find((entry) => entry.id === id)?.id.split("-")[1];
  return hackId && artwork.pins[hackId];
}).length;
if (entries.filter((entry) => entry.artwork).length !== retainedArtworkCount) throw new Error("Artwork pin count does not match retained verified entries");
const json = `${JSON.stringify(registry, null, 2)}\n`;
const temporary = `${outputPath}.tmp`;
await writeFile(temporary, json, { encoding: "utf8", flag: "w" });
await rename(temporary, outputPath);
console.error(`Generated ${entries.length} BPS entries at ${outputPath}`);
