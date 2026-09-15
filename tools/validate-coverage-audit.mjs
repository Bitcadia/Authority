#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(process.argv[2] || ".");
const auditPath = process.argv[3] || "sources/n64-coverage-audit-v1.json";
if (process.argv.length > 4) throw Error("usage: node tools/validate-coverage-audit.mjs [ROOT] [AUDIT_PATH]");
const audit = JSON.parse(await readFile(resolve(root, auditPath)));
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
if (!audit.requiredArtifactFields.includes("outputSha256") || !audit.requiredArtifactFields.includes("rights")) throw Error("artifact audit omits output/rights requirements");
if (!audit.requiredProjects.some(project => project.name === "GoldenEye X" && project.status === "pending-source-audit")) throw Error("GoldenEye X must remain explicitly pending until verified");
if (!audit.requiredProjects.some(project => project.name === "Goldfinger 64" && project.status === "pending-source-audit")) throw Error("Goldfinger 64 must remain explicitly pending until verified");
if (!audit.requiredProjects.some(project => project.name === "Doom 64 projects" && project.status === "pending-source-audit")) throw Error("Doom 64 must remain explicitly pending until verified");
console.log(`Coverage audit valid: ${projects.size} required projects, ${sources.size} active signed sources, ${audit.priorityFamilies.length} priority families`);
