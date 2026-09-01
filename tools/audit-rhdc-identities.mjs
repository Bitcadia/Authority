#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const registryPath = resolve(process.argv[2] || "sources/rhdc-bps-registry-v1.json");
const basePath = resolve(process.argv[3] || "Super Mario 64 (USA).z64");
const outputPath = resolve(process.argv[4] || "sources/rhdc-artifact-identities.json");
const concurrency = Math.max(1, Math.min(8, Number(process.argv[5] || 4)));
const limit = Number(process.argv[6] || 0);
const maximumSize = 96 * 1024 * 1024;
const registry = JSON.parse(await readFile(registryPath, "utf8"));
const base = await readFile(basePath);

const sha = (name, bytes) => createHash(name).update(bytes).digest("hex").toUpperCase();
if (sha("sha256", base) !== "17CE077343C6133F8C9F2D6D6D9A4AB62C8CD2AA57C40AEA1F490B4C8BB21D91") throw new Error("Unexpected SM64 base ROM SHA-256");

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
const number = (bytes, state) => {
  let result = 0;
  let shift = 1;
  for (let count = 0; count < 10; count++) {
    if (state.offset >= bytes.length) throw new Error("Truncated BPS integer");
    const value = bytes[state.offset++];
    result += (value & 0x7f) * shift;
    if (!Number.isSafeInteger(result)) throw new Error("BPS integer overflow");
    if (value & 0x80) return result;
    shift *= 128;
    result += shift;
  }
  throw new Error("BPS integer overflow");
};
const signed = (bytes, state) => {
  const value = number(bytes, state);
  return (value & 1 ? -1 : 1) * Math.floor(value / 2);
};
const apply = (patch) => {
  if (patch.length < 16 || patch.subarray(0, 4).toString("ascii") !== "BPS1") throw new Error("Invalid BPS patch");
  const footer = patch.length - 12;
  if (crc32(base) !== patch.readUInt32LE(footer)) throw new Error("BPS source CRC mismatch");
  if (crc32(patch.subarray(0, patch.length - 4)) !== patch.readUInt32LE(footer + 8)) throw new Error("BPS patch CRC mismatch");
  const state = { offset: 4 };
  const sourceSize = number(patch, state);
  const targetSize = number(patch, state);
  const metadataSize = number(patch, state);
  if (sourceSize !== base.length || targetSize < 1 || targetSize > maximumSize || metadataSize > footer - state.offset) throw new Error("Invalid BPS sizes");
  state.offset += metadataSize;
  const target = Buffer.allocUnsafe(targetSize);
  let output = 0;
  let sourceRelative = 0;
  let targetRelative = 0;
  while (output < target.length) {
    if (state.offset >= footer) throw new Error("Truncated BPS command stream");
    const command = number(patch, state);
    const action = command & 3;
    const length = Math.floor(command / 4) + 1;
    if (length > target.length - output) throw new Error("BPS target overflow");
    if (action === 0) {
      if (output + length > base.length) throw new Error("BPS source read overflow");
      base.copy(target, output, output, output + length);
    } else if (action === 1) {
      if (length > footer - state.offset) throw new Error("BPS patch read overflow");
      patch.copy(target, output, state.offset, state.offset + length);
      state.offset += length;
    } else if (action === 2) {
      sourceRelative += signed(patch, state);
      if (sourceRelative < 0 || sourceRelative + length > base.length) throw new Error("BPS source copy overflow");
      base.copy(target, output, sourceRelative, sourceRelative + length);
      sourceRelative += length;
    } else {
      targetRelative += signed(patch, state);
      if (targetRelative < 0 || targetRelative >= output) throw new Error("BPS target copy invalid");
      for (let index = 0; index < length; index++) {
        if (targetRelative + index >= output + index) throw new Error("BPS target copy overflow");
        target[output + index] = target[targetRelative + index];
      }
      targetRelative += length;
    }
    output += length;
  }
  if (state.offset !== footer || crc32(target) !== patch.readUInt32LE(footer + 4)) throw new Error("BPS target verification failed");
  return target;
};

let checkpoint = { sourceRegistrySha256: sha("sha256", await readFile(registryPath)), identities: {}, failures: {} };
try {
  const existing = JSON.parse(await readFile(outputPath, "utf8"));
  if (existing.sourceRegistrySha256 === checkpoint.sourceRegistrySha256) checkpoint = existing;
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
let saveChain = Promise.resolve();
const save = () => saveChain = saveChain.then(async () => {
  checkpoint.completed = Object.keys(checkpoint.identities).length;
  checkpoint.failed = Object.keys(checkpoint.failures).length;
  const temporary = `${outputPath}.tmp`;
  await writeFile(temporary, `${JSON.stringify(checkpoint, null, 2)}\n`);
  await rename(temporary, outputPath);
});
const pending = registry.entries.filter((entry) => !checkpoint.identities[entry.id] && !checkpoint.failures[entry.id]).slice(0, limit || undefined);
let cursor = 0;
const worker = async () => {
  while (cursor < pending.length) {
    const entry = pending[cursor++];
    try {
      const response = await fetch(entry.patch.url, { redirect: "manual", signal: AbortSignal.timeout(120000) });
      if (!response.ok || response.status >= 300) throw new Error(`HTTP ${response.status}`);
      const declared = Number(response.headers.get("content-length"));
      if (Number.isFinite(declared) && (declared < 1 || declared > maximumSize)) throw new Error(`Invalid content length ${declared}`);
      const patch = Buffer.from(await response.arrayBuffer());
      if (patch.length < 1 || patch.length > maximumSize) throw new Error(`Invalid patch size ${patch.length}`);
      const target = apply(patch);
      const outputSha1 = sha("sha1", target);
      if (entry.output?.sha1 && outputSha1 !== entry.output.sha1.toUpperCase()) throw new Error(`Upstream output SHA-1 mismatch ${outputSha1}`);
      checkpoint.identities[entry.id] = {
        url: entry.patch.url,
        patchSize: patch.length,
        patchSha256: sha("sha256", patch),
        outputSha256: sha("sha256", target),
      };
      delete checkpoint.failures[entry.id];
    } catch (error) {
      checkpoint.failures[entry.id] = { url: entry.patch.url, reason: error.message };
    }
    await save();
    const done = Object.keys(checkpoint.identities).length + Object.keys(checkpoint.failures).length;
    if (done % 25 === 0) console.error(`${done}/${registry.entries.length}: ${checkpoint.completed} verified, ${checkpoint.failed} failed`);
  }
};
await Promise.all(Array.from({ length: concurrency }, worker));
await save();
console.error(`${checkpoint.completed}/${registry.entries.length} verified; ${checkpoint.failed} failed`);
