import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const load = async name => JSON.parse(await readFile(new URL(`../sources/${name}`, import.meta.url)));
test("canonical audit covers all games with source-scoped exact-base picks and explicit gaps", async () => {
  const audit = await load("canonical-audit.json");
  const picks = await load("canonical-picks.json");
  const sources = (await load("catalog-sources.json")).catalogs;
  const exclusions = await load("publication-exclusions.json");
  const entries = new Map();
  const games = new Set();
  for (const source of sources) for (const input of source.inputs) {
    for (const entry of (await load(`${input}-registry.json`)).entries) {
      if (!source.providers.includes(entry.source.provider) || exclusions[entry.id]) continue;
      entries.set(entry.id, { source: source.id, entry });
      games.add(entry.base.name);
    }
  }
  assert.deepEqual(new Set(audit.games.map(game => game.game)), games);
  assert.equal(games.size, 14);
  const slots = ["the-sequel", "the-dlc", "the-replacement", "the-experiment", "the-preserver"];
  for (const game of audit.games) {
    for (const slot of slots) assert.ok(game.picks.some(p => p.slot === slot) || game.unfilled.some(p => p.slot === slot));
    for (const choice of game.picks) {
      const { source, entry } = entries.get(choice.entryId);
      assert.equal(source, choice.source);
      assert.equal(entry.base.name, game.game);
      assert.equal(entry.base.normalizedSha256.toLowerCase(), choice.baseSha256);
      const configured = picks.authorities[source][choice.baseSha256.toUpperCase()][choice.slot];
      assert.equal(typeof configured === "string" ? configured : configured.entryId, entry.id);
      assert.ok(choice.reason && choice.caveat && choice.evidenceUrl);
    }
  }
  const preservers = audit.games.flatMap(game => game.picks).filter(pick => pick.slot === "the-preserver");
  assert.equal(preservers.length, 3);
  assert.ok(preservers.find(pick => pick.entryId === "perfect-dark-performance-catbox-7vit86").caveat.startsWith("Provisional:"));
});
