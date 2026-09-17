import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
test("curated release groups reference known entries and keep edition families distinct", async () => {
  const groups = JSON.parse(await readFile(new URL("../sources/release-groups.json", import.meta.url)));
  const source = JSON.parse(await readFile(new URL("../sources/rhdn-registry.json", import.meta.url)));
  for (const [id, group] of Object.entries(groups)) {
    assert.ok(source.entries.some(entry => entry.id === id), id);
    assert.match(group.projectId, /^[a-z0-9][a-z0-9._-]*[a-z0-9]$/);
    assert.match(group.releaseId, /^[a-z0-9][a-z0-9._-]*[a-z0-9]$/);
    assert.ok(Number.isInteger(group.releaseOrder) && group.releaseOrder >= 0);
  }
  assert.notEqual(groups["rhdn-hacks-5122-cb445ba58fdc"].projectId, groups["rhdn-hacks-5122-8289b0e886b1"].projectId);
  assert.notEqual(groups["rhdn-hacks-5138-34176f88df6f"].projectId, groups["rhdn-hacks-5138-b265bfe7408c"].projectId);
  assert.ok(groups["rhdn-hacks-5138-b265bfe7408c"].releaseOrder > groups["rhdn-hacks-5138-252b85b6639e"].releaseOrder);
});
