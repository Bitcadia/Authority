import test from "node:test";
import assert from "node:assert/strict";
import { matchRoms } from "../tools/match-rhdn-roms.mjs";

test("SHA-1 matches resolve big-endian SHA-256 but reject conflicting source evidence", () => {
  const mapping = { games: [{ game: "Example", hacks: [{ name: "Hack", status: "game-mapped-base-unverified", reportedRom: { sha1: "a".repeat(40), sha256: null, issues: [] } }] }] };
  const inventory = { files: [{ name: "example.z64", sha1: "A".repeat(40), sha256: "B".repeat(64), bigEndian: true, header: "80371240", size: 1024 }] };
  assert.equal(matchRoms(mapping, inventory).records[0].normalizedSha256, "B".repeat(64));
  mapping.games[0].hacks[0].reportedRom.sha256 = "c".repeat(64);
  assert.equal(matchRoms(mapping, inventory).records[0].status, "source-sha256-conflict");
  assert.equal(matchRoms(mapping, inventory).records[0].normalizedSha256, null);
  mapping.games[0].hacks[0].reportedRom.sha256 = null;
  inventory.files[0].bigEndian = false;
  assert.equal(matchRoms(mapping, inventory).records[0].status, "byte-order-review-required");
});
