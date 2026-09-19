import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const load = async name => JSON.parse(await readFile(new URL(`../sources/${name}`, import.meta.url)));
test("EverDrive list preserves every supplied item and exact-edition gaps", async () => {
  const audit = await load("everdrive-coverage.json");
  assert.equal(audit.entries.length, 46);
  const catalog = (await Promise.all(["community", "sm64", "rhdc", "rhdn", "hylian", "plaza", "smashremix"].map(name => load(`${name}-registry.json`)))).flatMap(doc => doc.entries);
  for (const item of audit.entries) for (const reference of item.catalogEntries) assert.ok(catalog.some(entry => entry.id === reference.entryId));
  const console74 = audit.entries.find(item => item.sourceUrl.endsWith("/5114/"));
  assert.equal(console74.status, "verified-chain-pending-publication");
  assert.equal(console74.catalogEntries.length, 0);
  const pdKakariko = audit.entries.find(item => item.sourceUrl.endsWith("/1326/"));
  assert.equal(pdKakariko.catalogEntries.length, 0);
  const evidence = await load("everdrive-verification.json");
  assert.equal(evidence.verified.length, 18);
  for (const record of evidence.verified) {
    assert.deepEqual(catalog.find(entry => entry.id === record.entry.id), record.entry);
    assert.equal(record.entry.compatibility, "patch-applied-not-playtested");
    assert.ok(record.hardwareEvidence);
  }
});
