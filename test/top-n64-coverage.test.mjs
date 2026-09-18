import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const load = async name => JSON.parse(await readFile(new URL(`../sources/${name}`, import.meta.url)));
const names = ["rhdc", "hylian", "sm64", "smashremix", "plaza", "rhdn", "community"];

test("recommendation coverage binds catalog IDs and verified additions without hiding gaps", async () => {
  const audit = await load("top-n64-coverage.json");
  const evidence = await load("top-n64-verification.json");
  const registries = new Map(await Promise.all(names.map(async name => [`${name}-registry.json`, (await load(`${name}-registry.json`)).entries])));
  const exclusions = await load("publication-exclusions.json");
  assert.equal(audit.projects.length, 33);
  assert.equal(new Set(audit.projects.map(project => project.name)).size, 33);
  const expectedRanks = new Map([["fandomspot-n64", 15], ["retrododo-n64", 18], ["fandomspot-sm64", 10]]);
  for (const [id, count] of expectedRanks) {
    const ranks = audit.projects.flatMap(project => project.recommendations.filter(item => item.listId === id).map(item => item.rank)).sort((a, b) => a - b);
    assert.deepEqual(ranks, Array.from({ length: count }, (_, i) => i + 1));
  }
  for (const project of audit.projects) {
    if (project.status === "blocked") {
      assert.equal(project.catalogEntries.length, 0);
      assert.ok(project.reason && project.sourceUrls.length);
      continue;
    }
    assert.ok(project.catalogEntries.length);
    for (const ref of project.catalogEntries) {
      const entry = registries.get(ref.registry)?.find(entry => entry.id === ref.entryId);
      assert.ok(entry, ref.entryId);
      assert.ok(!exclusions[entry.id], entry.id);
      if (project.status === "added-source") assert.ok(evidence.verified.some(record => record.id === entry.id));
    }
  }
  assert.equal(evidence.verified.length, 9);
  for (const record of evidence.verified) {
    const matches = [...registries.values()].flat().filter(entry => entry.id === record.id);
    assert.equal(matches.length, 1, record.id);
    const entry = matches[0];
    assert.deepEqual(entry.patch, record.patch);
    assert.deepEqual(entry.base, record.base);
    assert.deepEqual(entry.output, record.output);
    assert.equal(record.reproducibilityResult, "two-client-decoder-runs-and-client-zip-extraction");
    assert.equal(entry.patch.allowRedirects, false);
    assert.equal(record.gameplayTested, false);
  }
  assert.equal([...registries.values()].flat().find(entry => entry.id === "n64vault-goldeneye-x-6a").base.name, "Perfect Dark");
});
