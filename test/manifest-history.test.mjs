import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign, createHash } from "node:crypto";
import { verifyHistoricalManifest } from "../tools/build-manifest-history.mjs";
test("historical signatures bind identity and payload even after expiry", () => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const id = "ed25519:" + publicKey.export({ format: "der", type: "spki" }).subarray(-32).toString("base64url");
  const bytes = Buffer.from(JSON.stringify({ authorityId: id, sequence: 3, expiresAt: "2000-01-01T00:00:00Z" }));
  const envelope = { payload: bytes.toString("base64url"), signature: { algorithm: "ed25519", authorityId: id, value: sign(null, Buffer.concat([Buffer.from("bitcadia64-authority-manifest-v2\0"), bytes]), privateKey).toString("base64url") } };
  assert.equal(verifyHistoricalManifest(JSON.stringify(envelope), [id]).hash, createHash("sha256").update(bytes).digest("hex"));
  assert.throws(() => verifyHistoricalManifest(JSON.stringify(envelope), []), /identity/);
  envelope.signature.value = Buffer.alloc(64).toString("base64url");
  assert.throws(() => verifyHistoricalManifest(JSON.stringify(envelope), [id]), /signature/);
});
