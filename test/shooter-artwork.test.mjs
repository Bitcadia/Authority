import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const load = async name => JSON.parse(await readFile(new URL(`../sources/${name}`, import.meta.url)));
test("shooter artwork pins reject generic logos and preserve source project attribution", async () => {
  const report = await load("shooter-artwork-verification.json");
  assert.equal(report.verified.length, 8);
  for (const evidence of report.verified) {
    const catalog = await load(evidence.registry);
    const entry = catalog.entries.find(entry => entry.id === evidence.id);
    assert.deepEqual(entry.artwork, evidence.artwork);
    assert.notEqual(entry.artwork.sha256, "3fa746b867cd8c893527ca6c68197c5e8c912358a6bbbe72da2dc60be8d57dbe");
    assert.equal(entry.artwork.sourcePage, entry.projectUrl);
    assert.ok(evidence.clientDownloadVerification);
  }
  assert.equal(report.unresolved.length, 5);
});
