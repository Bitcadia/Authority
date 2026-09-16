#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const requiredArtifactFields = [
  "originalSourceUrl", "projectUrl", "baseRomIdentity", "patchFormat",
  "patchSize", "patchSha256", "outputSha256", "rights", "reproducibilityResult",
];

export function validateCoverageAudit(audit) {
  if (audit.schemaVersion !== 1 || audit.purpose !== "coverage-audit") throw Error("invalid coverage audit identity");
  if (!Array.isArray(audit.requiredProjects) || !Array.isArray(audit.priorityFamilies) || !Array.isArray(audit.activeSignedSources)) throw Error("invalid coverage audit arrays");
  const projects = new Set();
  for (const project of audit.requiredProjects) {
    if (!project.name || !["active", "pending-source-audit", "unsupported", "excluded"].includes(project.status) || !project.reason) throw Error(`invalid project status: ${project.name}`);
    if (projects.has(project.name)) throw Error(`duplicate project: ${project.name}`);
    projects.add(project.name);
  }
  const sources = new Set();
  for (const source of audit.activeSignedSources) {
    if (!source.id || !source.name || source.status !== "active" || !source.scope) throw Error("invalid active source");
    if (sources.has(source.id)) throw Error(`duplicate source: ${source.id}`);
    sources.add(source.id);
  }
  if (!Array.isArray(audit.requiredArtifactFields)) throw Error("invalid artifact requirements array");
  for (const field of requiredArtifactFields) {
    if (!audit.requiredArtifactFields.includes(field)) throw Error(`artifact audit omits requirement: ${field}`);
  }
  for (const name of ["GoldenEye X", "Goldfinger 64", "Doom 64 projects"]) {
    if (!audit.requiredProjects.some(project => project.name === name && project.status === "pending-source-audit")) throw Error(`${name} must remain explicitly pending until verified`);
  }
  return { projectCount: projects.size, sourceCount: sources.size, familyCount: audit.priorityFamilies.length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length > 4) throw Error("usage: node tools/validate-coverage-audit.mjs [ROOT] [AUDIT_PATH]");
  const root = resolve(process.argv[2] || ".");
  const auditPath = process.argv[3] || "sources/n64-coverage-audit.json";
  const audit = JSON.parse(await readFile(resolve(root, auditPath)));
  const result = validateCoverageAudit(audit);
  console.log(`Coverage audit valid: ${result.projectCount} required projects, ${result.sourceCount} active signed sources, ${result.familyCount} priority families`);
}
