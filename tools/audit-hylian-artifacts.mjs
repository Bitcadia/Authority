#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { inflateRawSync } from "node:zlib";

const snapshotPath = resolve(process.argv[2] || "sources/hylian-registry-snapshot-v1.json");
const overridesPath = resolve(process.argv[3] || "sources/hylian-release-overrides-v1.json");
const outputPath = resolve(process.argv[4] || "sources/hylian-artifact-pins-v1.json");
const existingRegistryPath = resolve(process.argv[5] || "sources/hylian-bps-registry-v1.json");
const snapshot = JSON.parse(await readFile(snapshotPath, "utf8"));
const overrides = JSON.parse(await readFile(overridesPath, "utf8"));
const existingRegistry = JSON.parse(await readFile(existingRegistryPath, "utf8"));
const existingVersions = new Map(existingRegistry.entries.map((entry) => [new URL(entry.source.metadataUrl).pathname.toLowerCase(), entry.version]));
const maximumArtifactSize = 96 * 1024 * 1024;
const bases = {
  CD16C529: { name: "The Legend of Zelda: Ocarina of Time", variant: "USA", gameCode: "CZLE", normalizedCrc32: "CD16C529", normalizedSha256: "C916AB315FBE82A22169BFF13D6B866E9FDDC907461EB6B0A227B82ACDF5B506" },
  B428D8A7: { name: "The Legend of Zelda: Majora's Mask", variant: "USA", gameCode: "NZSE", normalizedCrc32: "B428D8A7", normalizedSha256: "EFB1365B3AE362604514C0F9A1A2D11F5DC8688BA5BE660A37DEBF5E3BE43F2B" }
};

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex").toUpperCase();
const hex32 = (value) => value.toString(16).toUpperCase().padStart(8, "0");
const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? (value >>> 1) ^ 0xedb88320 : value >>> 1;
  return value >>> 0;
});
const crc32 = (bytes) => {
  let value = 0xffffffff;
  for (const byte of bytes) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
};
const bpsNumber = (bytes, state) => {
  let result = 0;
  let shift = 1;
  while (true) {
    if (state.position >= bytes.length) throw new Error("Truncated BPS integer");
    const value = bytes[state.position++];
    result += (value & 0x7f) * shift;
    if (value & 0x80) return result;
    shift *= 128;
    result += shift;
    if (!Number.isSafeInteger(result) || !Number.isSafeInteger(shift)) throw new Error("BPS integer overflow");
  }
};
const bpsInfo = (bytes) => {
  if (bytes.length < 16 || bytes.subarray(0, 4).toString("ascii") !== "BPS1") throw new Error("Not a BPS patch");
  const state = { position: 4 };
  const sourceSize = bpsNumber(bytes, state);
  const targetSize = bpsNumber(bytes, state);
  const metadataSize = bpsNumber(bytes, state);
  if (sourceSize !== 32 * 1024 * 1024 || targetSize < 1 || targetSize > maximumArtifactSize || metadataSize > bytes.length - 12 - state.position) throw new Error("Invalid BPS sizes");
  state.position += metadataSize;
  let produced = 0;
  let sourceRelative = 0;
  let targetRelative = 0;
  while (state.position < bytes.length - 12) {
    const command = bpsNumber(bytes, state);
    const action = command & 3;
    const length = Math.floor(command / 4) + 1;
    if (length > targetSize - produced) throw new Error("BPS target overflow");
    if (action === 0 && produced + length > sourceSize) throw new Error("BPS source read overflow");
    if (action === 1) state.position += length;
    if (action === 2 || action === 3) {
      const relative = bpsNumber(bytes, state);
      const delta = (relative & 1 ? -1 : 1) * Math.floor(relative / 2);
      if (action === 2) {
        sourceRelative += delta;
        if (sourceRelative < 0 || sourceRelative + length > sourceSize) throw new Error("BPS source copy overflow");
        sourceRelative += length;
      } else {
        targetRelative += delta;
        if (targetRelative < 0 || targetRelative >= produced) throw new Error("BPS target copy overflow");
        targetRelative += length;
      }
    }
    if (state.position > bytes.length - 12) throw new Error("BPS command overflow");
    produced += length;
  }
  if (state.position !== bytes.length - 12 || produced !== targetSize) throw new Error("Invalid BPS command stream");
  const sourceCrc32 = hex32(bytes.readUInt32LE(bytes.length - 12));
  const patchCrc32 = bytes.readUInt32LE(bytes.length - 4);
  if (crc32(bytes.subarray(0, bytes.length - 4)) !== patchCrc32) throw new Error("BPS patch CRC mismatch");
  return { sourceCrc32, targetCrc32: hex32(bytes.readUInt32LE(bytes.length - 8)), patchCrc32: hex32(patchCrc32) };
};
const vcdiffProfile = (bytes, sourceSize) => {
  let position = 0;
  const byte = () => { if (position >= bytes.length) throw new Error("Truncated VCDIFF"); return bytes[position++]; };
  const integer = () => { let result = 0; let value; let count = 0; do { value = byte(); result = result * 128 + (value & 0x7f); if (!Number.isSafeInteger(result) || ++count > 10) throw new Error("VCDIFF integer overflow"); } while (value & 0x80); return result; };
  const sectionInteger = (section, state) => { let result = 0; let value; let count = 0; do { if (state.position >= section.length) throw new Error("VCDIFF section overflow"); value = section[state.position++]; result = result * 128 + (value & 0x7f); if (!Number.isSafeInteger(result) || ++count > 10) throw new Error("VCDIFF integer overflow"); } while (value & 0x80); return result; };
  const code = (index) => {
    const noop = { action: 0, size: 0, mode: 0 };
    if (index === 0) return [{ action: 2, size: 0, mode: 0 }, noop];
    if (index <= 18) return [{ action: 1, size: index - 1, mode: 0 }, noop];
    if (index <= 162) { const relative = index - 19; return [{ action: 3, size: relative % 16 === 0 ? 0 : 3 + relative % 16, mode: Math.floor(relative / 16) }, noop]; }
    if (index <= 234) { const relative = index - 163; return [{ action: 1, size: 1 + Math.floor((relative % 12) / 3), mode: 0 }, { action: 3, size: 4 + relative % 3, mode: Math.floor(relative / 12) }]; }
    if (index <= 246) { const relative = index - 235; return [{ action: 1, size: 1 + relative % 4, mode: 0 }, { action: 3, size: 4, mode: 6 + Math.floor(relative / 4) }]; }
    return [{ action: 3, size: 4, mode: index - 247 }, { action: 1, size: 1, mode: 0 }];
  };
  if (!bytes.subarray(0, 4).equals(Buffer.from([0xd6, 0xc3, 0xc4, 0x00]))) throw new Error("Invalid VCDIFF header");
  position = 4;
  const headerIndicator = byte();
  if (headerIndicator & ~0x07 || headerIndicator & 0x03) throw new Error("Unsupported VCDIFF header feature");
  if (headerIndicator & 0x04) position += integer();
  let targetPosition = 0;
  let windows = 0;
  while (position < bytes.length) {
    const indicator = byte();
    if ((indicator & ~0x07) || (indicator & 0x03) === 0x03) throw new Error("Unsupported VCDIFF window");
    let sourceLength = 0;
    let sourcePosition = 0;
    if (indicator & 0x03) { sourceLength = integer(); sourcePosition = integer(); }
    if (indicator & 0x01 && (sourcePosition > sourceSize || sourceLength > sourceSize - sourcePosition)) throw new Error("VCDIFF source window exceeds declared base");
    if (indicator & 0x02 && (sourcePosition > targetPosition || sourceLength > targetPosition - sourcePosition)) throw new Error("VCDIFF target window exceeds prior output");
    const deltaLength = integer();
    const deltaStart = position;
    const targetLength = integer();
    if (targetLength < 1 || targetLength > maximumArtifactSize - targetPosition) throw new Error("VCDIFF target size is invalid");
    if (byte() !== 0) throw new Error("VCDIFF secondary compression is unsupported");
    const dataLength = integer();
    const instructionLength = integer();
    const addressLength = integer();
    if (indicator & 0x04) throw new Error("Checksummed VCDIFF requires decoded-output verification");
    const dataStart = position;
    const instructionStart = dataStart + dataLength;
    const addressStart = instructionStart + instructionLength;
    const end = addressStart + addressLength;
    if (end > bytes.length) throw new Error("VCDIFF sections exceed patch");
    const data = bytes.subarray(dataStart, instructionStart);
    const instructions = bytes.subarray(instructionStart, addressStart);
    const addresses = bytes.subarray(addressStart, end);
    const dataState = { position: 0 };
    const instructionState = { position: 0 };
    const addressState = { position: 0 };
    const near = [0, 0, 0, 0];
    const same = new Array(3 * 256).fill(0);
    let nextNear = 0;
    let produced = 0;
    while (instructionState.position < instructions.length) {
      const operations = code(instructions[instructionState.position++]);
      for (const operation of operations) {
        if (operation.action === 0) continue;
        const length = operation.size || sectionInteger(instructions, instructionState);
        if (length < 1 || length > targetLength - produced) throw new Error("Invalid VCDIFF instruction size");
        if (operation.action === 1) {
          if (length > data.length - dataState.position) throw new Error("VCDIFF data section overflow");
          dataState.position += length;
        } else if (operation.action === 2) {
          if (dataState.position >= data.length) throw new Error("VCDIFF run section overflow");
          dataState.position += 1;
        } else {
          const here = sourceLength + produced;
          let address;
          if (operation.mode === 0) address = sectionInteger(addresses, addressState);
          else if (operation.mode === 1) { const distance = sectionInteger(addresses, addressState); if (distance > here) throw new Error("Invalid VCDIFF HERE address"); address = here - distance; }
          else if (operation.mode <= 5) address = near[operation.mode - 2] + sectionInteger(addresses, addressState);
          else { if (addressState.position >= addresses.length) throw new Error("VCDIFF address section overflow"); address = same[(operation.mode - 6) * 256 + addresses[addressState.position++]]; }
          if (!Number.isSafeInteger(address) || address >= here) throw new Error("Invalid VCDIFF copy address");
          if (address < sourceLength) {
            if (length > sourceLength - address) throw new Error("VCDIFF source copy overflow");
          } else if (address - sourceLength >= produced) throw new Error("VCDIFF target copy before produced output");
          near[nextNear] = address;
          nextNear = (nextNear + 1) % near.length;
          same[address % same.length] = address;
        }
        produced += length;
      }
    }
    if (produced !== targetLength || dataState.position !== data.length || addressState.position !== addresses.length) throw new Error("VCDIFF sections were not consumed exactly");
    position = end;
    if (position - deltaStart !== deltaLength) throw new Error("Invalid VCDIFF delta length");
    targetPosition += targetLength;
    windows += 1;
  }
  if (windows === 0 || targetPosition === 0) throw new Error("VCDIFF contains no output windows");
  return "rfc3284-default-code-table-no-secondary-compression";
};
const fetchArtifact = async (url, accountBytes, allowRedirects) => {
  let currentUrl = url;
  let response;
  for (let redirectCount = 0; ; redirectCount++) {
    response = await fetch(currentUrl, { redirect: "manual", signal: AbortSignal.timeout(120000) });
    if (response.status < 300 || response.status >= 400) break;
    if (!allowRedirects || redirectCount >= 4) throw new Error(`HTTP ${response.status}`);
    const location = response.headers.get("location");
    if (!location) throw new Error(`HTTP ${response.status} without Location`);
    const nextUrl = new URL(location, currentUrl);
    if (nextUrl.protocol !== "https:") throw new Error("Artifact redirect is not HTTPS");
    await response.body?.cancel();
    currentUrl = nextUrl;
  }
  if (!response.ok || response.redirected || response.url !== currentUrl.href) throw new Error(`HTTP ${response.status}`);
  const declaredHeader = response.headers.get("content-length");
  const declared = declaredHeader === null ? null : Number(declaredHeader);
  if (declared !== null && Number.isFinite(declared) && (declared < 1 || declared > maximumArtifactSize)) throw new Error(`Invalid content length ${declared}`);
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    accountBytes(value.length);
    size += value.length;
    if (size > maximumArtifactSize) { await reader.cancel(); throw new Error("Artifact exceeds 96 MiB"); }
    chunks.push(value);
  }
  return Buffer.concat(chunks, size);
};
const zipMembers = (bytes) => {
  const signature = 0x06054b50;
  let eocd = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset--) if (bytes.readUInt32LE(offset) === signature) { eocd = offset; break; }
  if (eocd < 0) throw new Error("ZIP end record missing");
  const commentLength = bytes.readUInt16LE(eocd + 20);
  if (eocd + 22 + commentLength !== bytes.length) throw new Error("Invalid ZIP end record");
  if (bytes.readUInt16LE(eocd + 4) !== 0 || bytes.readUInt16LE(eocd + 6) !== 0) throw new Error("Multi-disk ZIP is unsupported");
  const count = bytes.readUInt16LE(eocd + 10);
  if (bytes.readUInt16LE(eocd + 8) !== count || count > 4096) throw new Error("Invalid ZIP entry count");
  const centralSize = bytes.readUInt32LE(eocd + 12);
  let offset = bytes.readUInt32LE(eocd + 16);
  const centralStart = offset;
  if (centralStart > bytes.length || centralSize > bytes.length - centralStart || centralStart + centralSize !== eocd) throw new Error("Invalid ZIP central directory bounds");
  const result = [];
  const memberNames = new Set();
  let expandedTotal = 0;
  for (let index = 0; index < count; index++) {
    if (bytes.readUInt32LE(offset) !== 0x02014b50) throw new Error("Invalid ZIP central directory");
    const method = bytes.readUInt16LE(offset + 10);
    const flags = bytes.readUInt16LE(offset + 8);
    const memberCrc32 = bytes.readUInt32LE(offset + 16);
    const compressedSize = bytes.readUInt32LE(offset + 20);
    const uncompressedSize = bytes.readUInt32LE(offset + 24);
    const nameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const entryCommentLength = bytes.readUInt16LE(offset + 32);
    const localOffset = bytes.readUInt32LE(offset + 42);
    const name = bytes.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
    if (name.toLowerCase().endsWith(".bps")) {
      if (memberNames.has(name)) throw new Error(`Duplicate ZIP member name ${name}`);
      memberNames.add(name);
      if (flags & 1 || uncompressedSize < 1 || uncompressedSize > maximumArtifactSize || expandedTotal + uncompressedSize > maximumArtifactSize) throw new Error(`Unsafe ZIP member ${name}`);
      if (name.startsWith("/") || /^[A-Za-z]:/.test(name) || name.includes("\0") || name.split("/").some((part) => part === "..") || name.includes("\\")) throw new Error(`Unsafe ZIP member name ${name}`);
      if (bytes.readUInt32LE(localOffset) !== 0x04034b50) throw new Error("Invalid ZIP local header");
      const localFlags = bytes.readUInt16LE(localOffset + 6);
      const localMethod = bytes.readUInt16LE(localOffset + 8);
      if (localFlags !== flags || localMethod !== method) throw new Error(`ZIP local/central method mismatch ${name}`);
      const localNameLength = bytes.readUInt16LE(localOffset + 26);
      const localExtraLength = bytes.readUInt16LE(localOffset + 28);
      const localName = bytes.subarray(localOffset + 30, localOffset + 30 + localNameLength).toString("utf8");
      if (localName !== name) throw new Error(`ZIP member name mismatch ${name}`);
      const start = localOffset + 30 + localNameLength + localExtraLength;
      if (start > centralStart || compressedSize > centralStart - start) throw new Error(`ZIP member overlaps central directory ${name}`);
      if (!(flags & 0x08)) {
        if (bytes.readUInt32LE(localOffset + 14) !== memberCrc32 || bytes.readUInt32LE(localOffset + 18) !== compressedSize || bytes.readUInt32LE(localOffset + 22) !== uncompressedSize) throw new Error(`ZIP local/central size mismatch ${name}`);
      }
      const compressed = bytes.subarray(start, start + compressedSize);
      const member = method === 0 ? Buffer.from(compressed) : method === 8 ? inflateRawSync(compressed, { maxOutputLength: maximumArtifactSize - expandedTotal }) : null;
      if (!member || member.length !== uncompressedSize) throw new Error(`Unsupported or invalid ZIP member ${name}`);
      if (crc32(member) !== memberCrc32) throw new Error(`ZIP member CRC mismatch ${name}`);
      expandedTotal += member.length;
      result.push({ name, bytes: member, ...bpsInfo(member) });
    }
    offset += 46 + nameLength + extraLength + entryCommentLength;
  }
  if (offset !== eocd) throw new Error("ZIP central directory length mismatch");
  return result;
};
const releaseVersion = (metadata, metadataUrl, override) => override?.version || existingVersions.get(metadataUrl.pathname.toLowerCase()) || String(metadata.last_updated || "unknown").replace(/[^0-9A-Za-z._-]+/g, "-");

const pins = {};
const pending = [];
if (snapshot.records.length > 1000) throw new Error("Hylian artifact audit exceeds 1000 records");
let totalArtifactBytes = 0;
let cumulativeLimitReached = false;
const accountArtifactBytes = (length) => {
  totalArtifactBytes += length;
  if (totalArtifactBytes > 2 * 1024 * 1024 * 1024) {
    cumulativeLimitReached = true;
    throw new Error("Hylian artifact audit exceeds 2 GiB");
  }
};
for (const record of snapshot.records) {
  const metadata = record.metadata;
  const override = overrides.overrides?.[metadata.id];
  try {
    const metadataUrl = new URL(record.metadataUrl);
    const artifactUrl = new URL(override?.artifactUrl || metadata.download_link, metadataUrl);
    if (artifactUrl.protocol !== "https:") throw new Error("Artifact URL is not HTTPS");
    const extension = artifactUrl.pathname.split(".").pop().toLowerCase();
    if (!override?.artifactUrl && artifactUrl.origin !== metadataUrl.origin) throw new Error("External release page requires an explicit artifact override");
    if (!override?.artifactUrl && !["bps", "zip"].includes(extension)) throw new Error(`Unsupported artifact type: ${extension}`);
    const allowRedirects = override?.allowRedirects === true;
    const artifact = await fetchArtifact(artifactUrl, accountArtifactBytes, allowRedirects);
    const common = { version: releaseVersion(metadata, metadataUrl, override), url: artifactUrl.href, size: artifact.length, sha256: sha256(artifact), allowRedirects };
    if ((override?.format || extension) === "vcdiff") {
      const base = bases[override.baseCrc32];
      if (!base) throw new Error("VCDIFF override requires an explicit supported base CRC32");
      const profile = vcdiffProfile(artifact, 32 * 1024 * 1024);
      if (profile !== override.vcdiffProfile) throw new Error("VCDIFF profile mismatch");
      pins[metadata.id] = { ...common, format: "vcdiff", vcdiffProfile: profile, baseCrc32: override.baseCrc32 };
      continue;
    }
    if (extension === "bps") {
      const info = bpsInfo(artifact);
      if (!bases[info.sourceCrc32]) throw new Error(`Unsupported BPS source CRC32 ${info.sourceCrc32}`);
      pins[metadata.id] = { ...common, format: "bps", baseCrc32: info.sourceCrc32, ...info };
      continue;
    }
    const members = zipMembers(artifact).filter((member) => bases[member.sourceCrc32]);
    const selected = override?.archiveMember ? members.find((member) => member.name === override.archiveMember) : members.length === 1 ? members[0] : null;
    if (!selected) throw new Error(`ZIP has ${members.length} supported BPS members; an exact override is required`);
    pins[metadata.id] = {
      ...common,
      format: "bps",
      archiveMember: selected.name,
      memberSize: selected.bytes.length,
      memberSha256: sha256(selected.bytes),
      baseCrc32: selected.sourceCrc32,
      sourceCrc32: selected.sourceCrc32,
      targetCrc32: selected.targetCrc32,
      patchCrc32: selected.patchCrc32
    };
  } catch (error) {
    if (cumulativeLimitReached) throw error;
    pending.push({ id: metadata.id, name: metadata.name, downloadLink: metadata.download_link, reason: error.message });
  }
}

const document = {
  schemaVersion: 1,
  sourceCapturedAt: snapshot.source.capturedAt,
  generatedAt: new Date().toISOString(),
  pinCount: Object.keys(pins).length,
  pendingCount: pending.length,
  pins: Object.fromEntries(Object.entries(pins).sort(([left], [right]) => left.localeCompare(right))),
  pending: pending.sort((left, right) => left.id.localeCompare(right.id))
};
const temporary = `${outputPath}.tmp`;
await writeFile(temporary, `${JSON.stringify(document, null, 2)}\n`, { encoding: "utf8", flag: "w" });
await rename(temporary, outputPath);
console.error(`Pinned ${document.pinCount}/${snapshot.modCount} Hylian artifacts; pending ${document.pendingCount}`);
