import test from "node:test";
import assert from "node:assert/strict";
import { mapCapture } from "../tools/map-rhdn-games.mjs";

test("array exports recover plain hash labels and reject conflicting aliases", () => {
  const source = structuredClone(record);
  source.romInfo = { sha256: null, fields: { "SHA-256": "a".repeat(64), "SHA-1": "b".repeat(40) } };
  const registries = [{ entries: [{ base: { name: "Super Mario 64", normalizedSha256: "A".repeat(64) } }] }];
  const hack = mapCapture(JSON.stringify([source]), registries).games[0].hacks[0];
  assert.equal(hack.reportedRom.sha1, "B".repeat(40));
  assert.equal(hack.baseMapping.status, "source-reported-sha256-match");
  source.romInfo.sha256 = "c".repeat(64);
  const conflict = mapCapture(JSON.stringify([source]), registries).games[0].hacks[0];
  assert.equal(conflict.reportedRom.sha256, null);
  assert.equal(conflict.baseMapping.status, "review-required");
  assert.equal(conflict.baseMapping.knownBase, null);
});

const record = { pageUrl: "https://www.romhacking.net/hacks/1/", item: "hacks-1", meta: { id: "hacks-1", description: "quoted text" }, propertyMeta: { "og:url": "https://www.romhacking.net/hacks/1/", "og:title": "Example" }, fields: { Game: "Super Mario 64", Platform: "Nintendo 64", Version: "1" } };
test("maps game titles without treating base candidates as verified", () => {
  const map = mapCapture(JSON.stringify({ records: [record] }), [{ entries: [{ base: { name: "Super Mario 64", normalizedSha256: "a".repeat(64) } }] }]);
  assert.equal(map.games[0].knownBaseCandidates.length, 1);
  assert.equal(map.games[0].hacks[0].status, "game-mapped-base-unverified");
  assert.equal(map.issues.length, 0);
});
test("recovers only mapping fields from invalid descriptions and flags stale pages", () => {
  const stale = structuredClone(record);
  stale.pageUrl = "https://www.romhacking.net/hacks/2/";
  const text = JSON.stringify({ records: [record, stale] }, null, 4).replaceAll('"quoted text"', '"bad "quotes""');
  const map = mapCapture(text);
  assert.equal(map.inputJsonValid, false);
  assert.equal(map.recordCount, 2);
  assert.equal(map.uniqueCapturedItems, 1);
  assert.equal(map.games[0].hacks[0].projectUrl, record.pageUrl);
  assert.equal(map.issues.length, 1);
  assert.ok(map.issues[0].problems.includes("requested-page-does-not-match-captured-content"));
});
