import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const load = async name => JSON.parse(await readFile(new URL(`../sources/${name}`, import.meta.url)));

test("Amped Up keeps installable mirror and newer RAR release distinct", async () => {
  const evidence = await load("amped-up-verification.json");
  const registry = await load("community-registry.json");
  const candidate = evidence.publishedCandidate;
  const entry = registry.entries.find(entry => entry.id === candidate.entryId);
  assert.ok(entry);
  assert.equal(entry.version, "3.00");
  for (const field of ["patch", "base", "output", "source"]) assert.deepEqual(entry[field], candidate[field]);
  assert.match(entry.patch.url, /raw\.githubusercontent\.com\/Admentus64\/Patcher64Plus-Tool\/[a-f0-9]{40}\//);
  assert.equal(entry.patch.archiveMember, undefined);
  assert.equal(entry.patch.allowRedirects, false);
  assert.equal(entry.saveType, "eeprom16k");
  const latest = evidence.latestRelease;
  assert.equal(latest.version, "3.21");
  assert.equal(latest.status, "verified-patch-blocked-container");
  assert.match(latest.artifact.url, /\.rar$/);
  assert.equal(latest.member.format, "bps");
  assert.equal(latest.base.normalizedSha256, entry.base.normalizedSha256);
  assert.notEqual(latest.output.sha256, entry.output.sha256);
  assert.equal(latest.readmeMd5Matches, false);
  assert.notEqual(latest.readmeMd5, latest.output.md5);
  assert.ok(!registry.entries.some(entry => entry.patch.sha256 === latest.artifact.sha256));
});
