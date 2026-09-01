#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { inflateRawSync } from "node:zlib";

const sourceDirectory = resolve(process.argv[2] || "sources");
const helper = resolve(process.argv[3]);
const outputPath = resolve(process.argv[4] || "sources/pinned-output-identities.json");
const baseArguments = process.argv.slice(5);
const maximumSize = 96 * 1024 * 1024;
const sha = (name, bytes) => createHash(name).update(bytes).digest("hex").toUpperCase();
const bases = new Map();
for (const argument of baseArguments) {
  const separator = argument.indexOf("=");
  if (separator < 1) throw new Error("Base argument must be SHA256=path");
  const hash = argument.slice(0, separator).toUpperCase();
  const path = resolve(argument.slice(separator + 1));
  const bytes = await readFile(path);
  if (sha("sha256", bytes) !== hash) throw new Error(`Base ROM mismatch: ${path}`);
  bases.set(hash, path);
}

const zipMember = (bytes, expected) => {
  let eocd = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset--) {
    if (bytes.readUInt32LE(offset) === 0x06054b50) { eocd = offset; break; }
  }
  if (eocd < 0 || eocd + 22 + bytes.readUInt16LE(eocd + 20) !== bytes.length) throw new Error("Invalid ZIP end record");
  const count = bytes.readUInt16LE(eocd + 10);
  let offset = bytes.readUInt32LE(eocd + 16);
  const centralEnd = offset + bytes.readUInt32LE(eocd + 12);
  if (centralEnd !== eocd || count > 4096) throw new Error("Invalid ZIP directory");
  for (let index = 0; index < count; index++) {
    if (bytes.readUInt32LE(offset) !== 0x02014b50) throw new Error("Invalid ZIP entry");
    const flags = bytes.readUInt16LE(offset + 8);
    const method = bytes.readUInt16LE(offset + 10);
    const crc = bytes.readUInt32LE(offset + 16);
    const compressedSize = bytes.readUInt32LE(offset + 20);
    const size = bytes.readUInt32LE(offset + 24);
    const nameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const commentLength = bytes.readUInt16LE(offset + 32);
    const localOffset = bytes.readUInt32LE(offset + 42);
    const name = bytes.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
    offset += 46 + nameLength + extraLength + commentLength;
    if (name !== expected) continue;
    if (flags & 1 || size < 1 || size > maximumSize || ![0, 8].includes(method)) throw new Error("Unsafe ZIP member");
    if (bytes.readUInt32LE(localOffset) !== 0x04034b50) throw new Error("Invalid ZIP local entry");
    const localNameLength = bytes.readUInt16LE(localOffset + 26);
    const localExtraLength = bytes.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.subarray(start, start + compressedSize);
    const result = method === 0 ? Buffer.from(compressed) : inflateRawSync(compressed, { maxOutputLength: maximumSize });
    if (result.length !== size || crc32(result) !== crc) throw new Error("ZIP member verification failed");
    return result;
  }
  throw new Error("ZIP member not found");
};
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
const run = (argv) => new Promise((accept, reject) => {
  const child = spawn(argv[0], argv.slice(1), { stdio: ["ignore", "ignore", "pipe"], windowsHide: true });
  const errors = [];
  child.stderr.on("data", (bytes) => errors.push(bytes));
  child.on("error", reject);
  child.on("exit", (code) => code === 0 ? accept() : reject(new Error(Buffer.concat(errors).toString("utf8").trim() || `helper exited ${code}`)));
});

const entries = [];
for (const name of await readdir(sourceDirectory)) {
  if (!name.endsWith("registry-v1.json")) continue;
  const document = JSON.parse(await readFile(join(sourceDirectory, name), "utf8"));
  for (const entry of document.entries || []) if (entry.patch?.sha256) entries.push(entry);
}
const unique = [...new Map(entries.map((entry) => [`${entry.id}\0${entry.patch.url}`, entry])).values()];
let checkpoint = { identities: {}, failures: {} };
try { checkpoint = JSON.parse(await readFile(outputPath, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
const save = async () => {
  checkpoint.completed = Object.keys(checkpoint.identities).length;
  checkpoint.failed = Object.keys(checkpoint.failures).length;
  const temporary = `${outputPath}.tmp`;
  await writeFile(temporary, `${JSON.stringify(checkpoint, null, 2)}\n`);
  await rename(temporary, outputPath);
};
for (const entry of unique) {
  if (checkpoint.identities[entry.id]) continue;
  const patchPath = resolve(outputPath, `../.${entry.id}.patch`);
  const targetPath = resolve(outputPath, `../.${entry.id}.z64`);
  try {
    const basePath = bases.get(entry.base.normalizedSha256.toUpperCase());
    if (!basePath) throw new Error("Verified base ROM unavailable");
    const response = await fetch(entry.patch.url, { redirect: entry.patch.allowRedirects ? "follow" : "manual", signal: AbortSignal.timeout(120000) });
    if (!response.ok || (!entry.patch.allowRedirects && response.status >= 300)) throw new Error(`HTTP ${response.status}`);
    const artifact = Buffer.from(await response.arrayBuffer());
    if (artifact.length !== entry.patch.size || sha("sha256", artifact) !== entry.patch.sha256.toUpperCase()) throw new Error("Pinned patch identity mismatch");
    const patch = entry.patch.archiveMember ? zipMember(artifact, entry.patch.archiveMember) : artifact;
    if (entry.patch.memberSize && patch.length !== entry.patch.memberSize) throw new Error("Pinned member size mismatch");
    if (entry.patch.memberSha256 && sha("sha256", patch) !== entry.patch.memberSha256.toUpperCase()) throw new Error("Pinned member hash mismatch");
    await writeFile(patchPath, patch);
    await run([helper, entry.patch.format, basePath, patchPath, targetPath]);
    const target = await readFile(targetPath);
    checkpoint.identities[entry.id] = { url: entry.patch.url, outputSha256: sha("sha256", target) };
    delete checkpoint.failures[entry.id];
  } catch (error) {
    checkpoint.failures[entry.id] = { url: entry.patch.url, reason: error.message };
  } finally {
    await rm(patchPath, { force: true });
    await rm(targetPath, { force: true });
  }
  await save();
  console.error(`${checkpoint.completed}/${unique.length} verified; ${checkpoint.failed} failed; ${basename(entry.patch.url)}`);
}
await save();
