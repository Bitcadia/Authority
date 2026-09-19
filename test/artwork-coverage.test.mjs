import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const load = async name => JSON.parse(await readFile(new URL(`../sources/${name}`, import.meta.url)));
test("artwork audit accounts for every shooter and kart release including missing covers", async () => {
  const entries = (await Promise.all(["community", "rhdn"].map(name => load(`${name}-registry.json`)))).flatMap(doc => doc.entries);
  const expectations = {
    "Mario Kart 64": { total: 14, pinned: 9 },
    "GoldenEye 007": { total: 15, pinned: 11 },
    "Perfect Dark": { total: 4, pinned: 3 },
  };
  const missing = new Set([
    "patcher64plus-battle-kart-2.0", "perfect-dark-performance-catbox-7vit86",
    "rhdn-hacks-6148-99d02d014eef", "rhdn-hacks-6148-1adfda0d98d7",
    "rhdn-hacks-6148-9362c08c5498", "rhdn-hacks-6148-5070abd2d4d6",
    "rhdn-hacks-4467-3081be6a4420", "rhdn-hacks-4467-1a2151c084fa",
    "rhdn-hacks-4467-340cffa5e978", "rhdn-hacks-4467-f307407aaa99",
  ]);
  for (const [game, expected] of Object.entries(expectations)) {
    const group = entries.filter(entry => entry.base.name === game);
    assert.equal(group.length, expected.total, `${game}: audit new releases explicitly`);
    assert.equal(group.filter(entry => entry.artwork).length, expected.pinned);
    for (const entry of group) {
      assert.equal(!entry.artwork, missing.has(entry.id), entry.id);
      if (!entry.artwork) continue;
      assert.match(entry.artwork.url, /^https:\/\//);
      assert.match(entry.artwork.sha256, /^[a-f0-9]{64}$/);
      assert.ok(entry.artwork.size > 0 && entry.artwork.size <= 8 * 1024 * 1024);
      assert.equal(entry.rights.artworkRedistributionAllowed, false);
    }
  }
  for (const id of ["gamebanana-613207-1584378", "patcher64plus-amped-up-3.00", "gamebanana-378082-800696"])
    assert.ok(entries.find(entry => entry.id === id)?.artwork, id);
});
