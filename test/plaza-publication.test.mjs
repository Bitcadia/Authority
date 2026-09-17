import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const read = async name => JSON.parse(await readFile(new URL(`../sources/${name}`, import.meta.url)));
test("published Plaza variants bind successful decoder evidence", async () => {
  const source = await read("plaza-registry.json");
  const report = await read("plaza-verification.json");
  assert.equal(source.entries.length, 21);
  for (const entry of source.entries) {
    const evidence = report.verified.find(row => row.patch.sha256 === entry.patch.sha256 && row.patch.archiveMember === entry.patch.archiveMember && row.output.sha256 === entry.output.sha256);
    assert.ok(evidence, entry.id);
    assert.equal(evidence.reproducibility, "two-identical-client-decoder-runs");
    assert.equal(entry.output.size, evidence.output.size);
    assert.equal(entry.base.normalizedSha256.toUpperCase(), evidence.base.normalizedSha256.toUpperCase());
    assert.equal(entry.patch.allowRedirects, false);
    assert.equal(new URL(entry.patch.url).hostname, "gaia.romhackplaza.org");
    assert.doesNotMatch(entry.patch.archiveMember || "", /(?:^|\/)(?:Old|Older)\//i);
  }
});
