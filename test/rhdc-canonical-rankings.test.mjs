import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const load = async name => JSON.parse(await readFile(new URL(`../sources/${name}`, import.meta.url)));

test("every populated SM64 canonical slot belongs to an RHDC top-25 project", async () => {
  const rankings = await load("rhdc-canonical-rankings.json");
  const picks = await load("canonical-picks.json");
  const sources = (await load("catalog-sources.json")).catalogs;
  const exclusions = await load("publication-exclusions.json");
  const allowed = new Set();
  assert.deepEqual(rankings.pages.map(page => page.sortBy), ["downloads", "rating"]);
  for (const page of rankings.pages) {
    assert.equal(page.projects.length, 25);
    assert.equal(new Set(page.projects.map(project => project.hackId)).size, 25);
    assert.equal(new URL(page.apiUrl).searchParams.get("pageSize"), "25");
    assert.match(page.responseSha256, /^[a-f0-9]{64}$/);
    for (const [i, project] of page.projects.entries()) {
      assert.equal(project.rank, i + 1);
      allowed.add(project.projectUrl.toLowerCase());
    }
  }
  let count = 0;
  for (const source of sources) {
    const entries = (await Promise.all(source.inputs.map(input => load(`${input}-registry.json`))))
      .flatMap(doc => doc.entries).filter(entry => source.providers.includes(entry.source.provider));
    for (const choices of Object.values(picks.authorities[source.id] || {})) {
      for (const [slot, configured] of Object.entries(choices)) {
        const id = typeof configured === "string" ? configured : configured.entryId;
        const entry = entries.find(entry => entry.id === id);
        assert.ok(entry, id);
        if (entry.base.name !== "Super Mario 64") continue;
        assert.ok(!exclusions[id], id);
        assert.ok(allowed.has(entry.projectUrl.toLowerCase()), `${slot}: ${entry.name} is outside the top-25 union`);
        count++;
      }
    }
  }
  assert.equal(count, 4, "Preserver remains empty without a category-appropriate candidate");
});
