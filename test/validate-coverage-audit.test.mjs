import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { validateCoverageAudit } from "../tools/validate-coverage-audit.mjs";

const audit = JSON.parse(await readFile(new URL("../sources/n64-coverage-audit.json", import.meta.url)));

test("accepts coverage planning audit", () => {
  assert.deepEqual(validateCoverageAudit(audit), { projectCount: 4, sourceCount: 4, familyCount: 11 });
});

test("rejects duplicate project names", () => {
  const invalid = structuredClone(audit);
  invalid.requiredProjects.push(invalid.requiredProjects[0]);
  assert.throws(() => validateCoverageAudit(invalid), /duplicate project/);
});

for (const field of [
  "originalSourceUrl", "projectUrl", "baseRomIdentity", "patchFormat",
  "patchSize", "patchSha256", "outputSha256", "rights", "reproducibilityResult",
]) {
  test(`rejects missing artifact requirement: ${field}`, () => {
    const invalid = structuredClone(audit);
    invalid.requiredArtifactFields = invalid.requiredArtifactFields.filter(value => value !== field);
    assert.throws(() => validateCoverageAudit(invalid), { message: `artifact audit omits requirement: ${field}` });
  });
}

for (const value of [undefined, null, {}, "outputSha256 rights", []]) {
  test(`rejects invalid artifact requirements: ${JSON.stringify(value)}`, () => {
    const invalid = structuredClone(audit);
    invalid.requiredArtifactFields = value;
    assert.throws(() => validateCoverageAudit(invalid), /artifact/);
  });
}

test("rejects activation of pending GoldenEye X", () => {
  const invalid = structuredClone(audit);
  invalid.requiredProjects.find(project => project.name === "GoldenEye X").status = "active";
  assert.throws(() => validateCoverageAudit(invalid), /GoldenEye X/);
});

test("rejects duplicate source IDs", () => {
  const invalid = structuredClone(audit);
  invalid.activeSignedSources.push(invalid.activeSignedSources[0]);
  assert.throws(() => validateCoverageAudit(invalid), /duplicate source/);
});

test("import ignores consumer CLI arguments", () => {
  const script = `await import(${JSON.stringify(new URL("../tools/validate-coverage-audit.mjs", import.meta.url).href)})`;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", script, "one", "two", "three", "four"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "");
});
