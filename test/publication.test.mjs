import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, cp, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateKeyPairSync } from "node:crypto";
import { buildPublication } from "../tools/build-publication.mjs";
import { validatePublication } from "../tools/validate-publication.mjs";
import { signPublication } from "../tools/sign-publication.mjs";

test("generated publications preserve entries, pins, signatures and reproducibility", async t => {
  const root = await mkdtemp(join(tmpdir(), "authority-publication-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const directory of ["sources", "tools", "schemas"]) await cp(new URL(`../${directory}`, import.meta.url), join(root, directory), { recursive: true });
  const config = JSON.parse(await readFile(join(root, "sources/publication.json")));
  const keys = join(root, "keys");
  await mkdir(keys);
  for (const authority of config.authorities) {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    authority.authorityId = `ed25519:${publicKey.export({ type: "spki", format: "der" }).subarray(-32).toString("base64url")}`;
    await writeFile(join(keys, authority.keyFile), privateKey.export({ type: "pkcs8", format: "pem" }));
  }
  await writeFile(join(root, "sources/publication.json"), JSON.stringify(config));
  const output = join(root, "output");
  await buildPublication({ root, output, keyDirectory: keys });
  assert.deepEqual(await validatePublication(root, output, { requireSigned: true }), { entries: 1662, signed: true });
  const rootPayload = JSON.parse(await readFile(join(output, "authority-payload.json")));
  assert.equal(rootPayload.registry, undefined, "Bitcadia must be discovery-only");
  assert.deepEqual(rootPayload.peers.map(peer => peer.displayName).sort(), [
    "Romhacking.com", "Smash Remix", "Hylian Modding", "SM64 Romhacks",
    "Romhack Plaza", "Romhacking.net (archive)", "GameBanana", "N64 Vault", "Patcher64Plus (mirror)",
    "Perfect Dark decompilation",
    "FazanaJ",
  ].sort());
  const expectedCounts = { rhdc: 1511, smashremix: 1, hylian: 26, sm64: 21, plaza: 21, rhdn: 58, gamebanana: 6, n64vault: 14, patcher64plus: 2, "pd-performance": 1, fazanaj: 1 };
  const policy = JSON.parse(await readFile(join(root, "sources/catalog-sources.json")));
  const publishedIds = new Set();
  const recommendations = JSON.parse(await readFile(join(root, "sources/rhdc-recommendations.json")));
  const promoted = new Set();
  for (const source of policy.catalogs) {
    const peer = rootPayload.peers.find(peer => peer.displayName === source.displayName);
    const index = JSON.parse(await readFile(join(output, peer.registry.url.slice(config.baseUrl.length))));
    const expectedCategories = recommendations.pages.filter(page => page.projects.some(project => project.entries[source.id]?.length));
    assert.deepEqual(index.categoryDefinitions.map(category => category.id), expectedCategories.map(page => page.category));
    let count = 0;
    for (const game of index.games) {
      const list = JSON.parse(await readFile(join(output, game.list.url.slice(config.baseUrl.length))));
      for (const page of expectedCategories) {
        const expectedIds = page.projects.flatMap(project => project.entries[source.id] || []).filter(id => list.entries.some(entry => entry.id === id));
        const picks = game.targets.flatMap(target => target.picks).filter(pick => pick.category === page.category);
        assert.deepEqual(picks.map(pick => pick.entryId), expectedIds);
        for (const pick of picks) {
          const entry = list.entries.find(entry => entry.id === pick.entryId);
          assert.equal(pick.entrySha256, entry.entrySha256);
          assert.equal(pick.outputSha256, entry.output.sha256);
          promoted.add(pick.entryId);
        }
      }
      for (const entry of list.entries) {
        assert.ok(source.providers.includes(entry.source.provider), entry.id);
        assert.ok(!publishedIds.has(entry.id), `Duplicate source record: ${entry.id}`);
        publishedIds.add(entry.id);
        count++;
      }
    }
    assert.equal(count, expectedCounts[source.id]);
  }
  assert.equal(promoted.size, 16, "14 eligible projects, including two retained source-record duplicates");
  const second = join(root, "second");
  await buildPublication({ root, output: second, keyDirectory: keys });
  assert.deepEqual(await readFile(join(output, "authority-manifest.json")), await readFile(join(second, "authority-manifest.json")));
  await assert.rejects(buildPublication({ root, output, keyDirectory: keys }), /EEXIST/);
  const manifestPath = join(output, "authority-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath));
  manifest.signature.value = Buffer.alloc(64).toString("base64url");
  await writeFile(manifestPath, JSON.stringify(manifest));
  await assert.rejects(validatePublication(root, output, { requireSigned: true }), /signature/);
  const unsigned = join(root, "unsigned");
  await buildPublication({ root, output: unsigned });
  assert.equal((await validatePublication(root, unsigned)).entries, 1662);
  const unsignedRoot = join(unsigned, "authority-payload.json");
  const originalRoot = await readFile(unsignedRoot);
  const mislabeled = JSON.parse(originalRoot);
  mislabeled.peers[0].displayName = "Bitcadia Authority";
  await writeFile(unsignedRoot, JSON.stringify(mislabeled));
  await assert.rejects(validatePublication(root, unsigned), /attribution/);
  await writeFile(unsignedRoot, originalRoot);
  await assert.rejects(validatePublication(root, unsigned, { requireSigned: true }), /Signed publication required/);
  const state = join(root, "state");
  await mkdir(state);
  const signing = { artifact: unsigned, policyRoot: root, keyDirectory: keys, stateDirectory: state };
  await signPublication(signing);
  assert.equal((await validatePublication(root, unsigned, { requireSigned: true })).signed, true);
  const signature = await readFile(join(unsigned, "authority-manifest.json"));
  await signPublication(signing);
  assert.deepEqual(await readFile(join(unsigned, "authority-manifest.json")), signature);
  const payloadPath = join(unsigned, "authority-payload.json");
  const original = await readFile(payloadPath);
  const changed = JSON.parse(original);
  changed.displayName = "Conflicting publication";
  await writeFile(payloadPath, JSON.stringify(changed));
  await assert.rejects(signPublication(signing), /Conflicting publication/);
  await writeFile(payloadPath, original);
  await mkdir(join(state, ".signing-lock"));
  await assert.rejects(signPublication(signing), /EEXIST/);
  await rm(join(state, ".signing-lock"), { recursive: true });
  const payload = JSON.parse(await readFile(join(unsigned, "authority-payload.json")));
  const indexPath = join(unsigned, payload.peers[0].registry.url.slice(config.baseUrl.length));
  await writeFile(indexPath, `${await readFile(indexPath, "utf8")} `);
  await assert.rejects(validatePublication(root, unsigned), /index pin/);
});
