import test from "node:test";
import assert from "node:assert/strict";
import { decodeSourceCapture, readSourceCapture } from "../tools/read-source-capture.mjs";
import { importRhdnSource } from "../tools/import-rhdn-source.mjs";

test("UTF-8 and legacy Windows-1252 captures preserve names and punctuation", () => {
  assert.equal(decodeSourceCapture(Buffer.from("\ufeffPokémon — Luigi’s")), "Pokémon — Luigi’s");
  assert.equal(decodeSourceCapture(Buffer.from([0x50, 0x6f, 0x6b, 0xe9, 0x6d, 0x6f, 0x6e, 0x20, 0x97, 0x20, 0x92])), "Pokémon — ’");
});
test("recovered RHDN capture imports without replacement characters or fabricated pins", async () => {
  const text = await readSourceCapture(new URL("../rdhn.json", import.meta.url));
  assert.ok(!text.includes("\ufffd"));
  const capture = JSON.parse(text);
  const result = importRhdnSource(capture);
  assert.ok(result.entryCount > 0);
  assert.equal(result.purpose, "source-download-index");
  for (const game of result.games) for (const entry of game.entries) {
    assert.equal(entry.provenance, "source-reported");
    assert.equal(entry.baseIdentity, null);
    assert.equal(entry.patch, undefined);
    assert.equal(entry.output, undefined);
  }
});
