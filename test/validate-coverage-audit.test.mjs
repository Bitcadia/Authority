import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateCoverageAudit } from "../tools/validate-coverage-audit.mjs";

const audit = JSON.parse(await readFile(new URL("../sources/n64-coverage-audit-v1.json", import.meta.url)));

test("accepts signed coverage audit", () => {
  assert.deepEqual(validateCoverageAudit(audit), { projectCount: 4, sourceCount: 4, familyCount: 11 });
});

test("rejects duplicate project names", () => {
  const invalid = structuredClone(audit);
  invalid.requiredProjects.push(invalid.requiredProjects[0]);
  assert.throws(() => validateCoverageAudit(invalid), /duplicate project/);
});

test("rejects missing artifact rights requirement", () => {
  const invalid = structuredClone(audit);
  invalid.requiredArtifactFields = invalid.requiredArtifactFields.filter(field => field !== "rights");
  assert.throws(() => validateCoverageAudit(invalid), /output\/rights/);
});

test("rejects activation of pending GoldenEye X", () => {
  const invalid = structuredClone(audit);
  invalid.requiredProjects.find(project => project.name === "GoldenEye X").status = "active";
  assert.throws(() => validateCoverageAudit(invalid), /GoldenEye X/);
});
