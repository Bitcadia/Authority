import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const load = async name => JSON.parse(await readFile(new URL(`../sources/${name}`, import.meta.url)));

test("community expansion preserves verified artifacts and source identities", async () => {
  const registry = await load("community-registry.json");
  const evidence = await load("community-expansion-verification.json");
  assert.equal(evidence.verified.length, 6);
  const ids = new Set();
  for (const record of evidence.verified) {
    assert.ok(!ids.has(record.entry.id));
    ids.add(record.entry.id);
    const entry = registry.entries.find(entry => entry.id === record.entry.id);
    assert.deepEqual(entry, record.entry);
    assert.equal(record.verification, "two-client-decoder-runs");
    assert.equal(record.archiveVerification, entry.patch.archiveMember ? "client-zip-extractor" : "direct-patch");
    assert.equal(entry.patch.allowRedirects, false);
    assert.equal(entry.rights.patchRedistributionAllowed, false);
    assert.equal(record.gameplayTested, false);
    if (entry.artwork) {
      assert.equal(record.artworkVerification.hash, entry.artwork.sha256);
      assert.match(record.artworkVerification.dimensions, /^\d+x\d+$/);
    }
    assert.ok(!/_P[1-4]\.bps$/.test(entry.patch.archiveMember || ""));
  }
  assert.equal(evidence.smashRemix.latestVersion, (await load("smashremix-registry.json")).entries[0].version);
});
