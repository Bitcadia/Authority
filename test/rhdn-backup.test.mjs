import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { importBackup } from "../tools/import-rhdn-backup.mjs";
const load = async name => JSON.parse(await readFile(new URL(`../sources/${name}`, import.meta.url)));

test("archived RHDN entries preserve exact artifact, member, base and output evidence", async () => {
  const registry = await load("rhdn-registry.json");
  const report = await load("rhdn-backup-verification.json");
  assert.equal(registry.entries.length, 31);
  assert.equal(new Set(registry.entries.map(e => e.id)).size, 31);
  for (const entry of registry.entries) {
    const evidence = report.verified.find(record => record.id === entry.id);
    assert.ok(evidence, entry.id);
    assert.deepEqual(entry.patch, evidence.patch);
    assert.deepEqual(entry.output, evidence.output);
    assert.equal(entry.base.normalizedSha256.toLowerCase(), evidence.base.normalizedSha256);
    assert.equal(entry.base.normalizedCrc32, evidence.base.normalizedCrc32);
    assert.equal(evidence.verification, "two-client-decoder-runs-and-client-zip-extraction");
    assert.equal(entry.patch.allowRedirects, false);
    assert.equal(entry.source.retrievedAt, "2021-09-14T00:00:00Z");
    assert.equal(entry.rights.patchRedistributionAllowed, false);
  }
});

test("backup import rejects unbound public downloads and deduplicates existing outputs", async () => {
  const report = await load("rhdn-backup-verification.json");
  const existing = (await Promise.all(["rhdc", "hylian", "sm64", "smashremix", "plaza"].map(name => load(`${name}-registry.json`)))).flatMap(d => d.entries);
  const result = importBackup(report, existing);
  assert.equal(result.registry.entries.length, 31);
  assert.equal(result.duplicates.length, 14);
  assert.equal(importBackup(report, [...existing, ...result.registry.entries]).registry.entries.length, 0);
  const invalid = structuredClone(report);
  invalid.artifacts = {};
  assert.throws(() => importBackup(invalid, existing), /Missing public archive identity/);
});
