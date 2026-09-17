import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
test("curated release groups reference known entries and keep edition families distinct", async () => {
  const groups = JSON.parse(await readFile(new URL("../sources/release-groups.json", import.meta.url)));
  const sources = await Promise.all(["rhdc", "hylian", "sm64", "smashremix", "plaza", "rhdn"].map(async name => JSON.parse(await readFile(new URL(`../sources/${name}-registry.json`, import.meta.url)))));
  const entries = sources.flatMap(source => source.entries);
  for (const [id, group] of Object.entries(groups)) {
    assert.ok(entries.some(entry => entry.id === id), id);
    assert.match(group.projectId, /^[a-z0-9][a-z0-9._-]*[a-z0-9]$/);
    assert.match(group.releaseId, /^[a-z0-9][a-z0-9._-]*[a-z0-9]$/);
    assert.ok(Number.isInteger(group.releaseOrder) && group.releaseOrder >= 0);
  }
  assert.notEqual(groups["rhdn-hacks-5122-cb445ba58fdc"].projectId, groups["rhdn-hacks-5122-8289b0e886b1"].projectId);
  assert.notEqual(groups["rhdn-hacks-5138-34176f88df6f"].projectId, groups["rhdn-hacks-5138-b265bfe7408c"].projectId);
  assert.ok(groups["rhdn-hacks-5138-b265bfe7408c"].releaseOrder > groups["rhdn-hacks-5138-252b85b6639e"].releaseOrder);
});

test("same-name project audit covers every candidate and Dawn Dusk source/base revision", async () => {
  const groups = JSON.parse(await readFile(new URL("../sources/release-groups.json", import.meta.url)));
  const audit = JSON.parse(await readFile(new URL("../sources/project-group-audit.json", import.meta.url)));
  for (const project of audit.projects) {
    assert.equal(project.status, "curated", project.name);
    for (const id of project.entries) assert.ok(groups[id], id);
  }
  const dawn = Object.entries(groups).filter(([id]) => id === "hylian-zelda64_dawn_and_dusk" || id.startsWith("rhdn-hacks-5816-"));
  assert.equal(dawn.length, 4);
  assert.equal(new Set(dawn.map(([, group]) => group.projectId)).size, 1);
  assert.equal(new Set(dawn.map(([, group]) => group.releaseId)).size, 1);
  assert.notEqual(groups["plaza-3190-2f666bb6070b"].projectId, groups["plaza-3190-882129c697cf"].projectId);
});
