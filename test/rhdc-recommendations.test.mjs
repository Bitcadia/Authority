import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const load = async name => JSON.parse(await readFile(new URL(`../sources/${name}`, import.meta.url)));

test("RHDC first-page recommendations preserve rankings, provenance and admission gaps", async () => {
  const snapshot = await load("rhdc-recommendations.json");
  const sources = (await load("catalog-sources.json")).catalogs;
  const excluded = await load("publication-exclusions.json");
  const projects = new Set(), eligible = new Set(), gaps = new Set();
  for (const page of snapshot.pages) {
    assert.equal(page.projects.length, 10);
    const api = new URL(page.apiUrl);
    assert.equal(api.origin, "https://api.romhacking.com");
    assert.equal(api.searchParams.get("pageSize"), "10");
    assert.equal(api.searchParams.get("mature"), "no");
    assert.equal(api.searchParams.get("sortOrder"), "desc");
    assert.equal(api.searchParams.get("sortBy"), page.category === "rhdc-most-downloaded" ? "downloads" : "rating");
    for (const [i, project] of page.projects.entries()) {
      assert.equal(project.rank, i + 1);
      projects.add(project.hackId);
      const mappings = Object.entries(project.entries);
      if (!mappings.length) { assert.ok(project.gap); gaps.add(project.hackId); }
      for (const [catalog, ids] of mappings) {
        const source = sources.find(source => source.id === catalog);
        assert.ok(source);
        const entries = (await Promise.all(source.inputs.map(input => load(`${input}-registry.json`))))
          .flatMap(doc => doc.entries).filter(entry => source.providers.includes(entry.source.provider));
        for (const id of ids) {
          assert.ok(!excluded[id], id);
          const entry = entries.find(entry => entry.id === id);
          assert.ok(entry, id);
          assert.equal(entry.name, project.name);
          eligible.add(project.hackId);
        }
      }
    }
  }
  assert.equal(projects.size, 18);
  assert.equal(eligible.size, 14);
  assert.equal(gaps.size, 4);
});
