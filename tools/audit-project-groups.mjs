import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const load = async name => JSON.parse(await readFile(new URL(`../sources/${name}`, import.meta.url)));
const groups = await load("release-groups.json");
const evidence = new Map((await load("rhdn-backup-verification.json")).verified.map(e => [e.id, e]));
const normalize = s => s.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
const names = new Map();
const allEntries = [];
for (const source of ["rhdc", "hylian", "sm64", "smashremix", "plaza", "rhdn"]) {
  for (const entry of (await load(`${source}-registry.json`)).entries) {
    allEntries.push(entry);
    const title = evidence.get(entry.id)?.name || entry.name.split(" — ")[0];
    const key = `${normalize(entry.base.name)}:${normalize(title)}`;
    if (!names.has(key)) names.set(key, []);
    names.get(key).push({ source, entry, title });
  }
}
// Explicit edition decisions: retain separate editions but group mirrors/versions.
const editionGroups = {
  "star-road": ["rhdc-5e209fb7ea2543645dc04264-1.02", "rhdc-super-mario-star-road-1.02", "plaza-3190-5de8da06abb1"],
  "star-road-deluxe": ["plaza-3190-882129c697cf", "plaza-3190-dbb54d14198a"],
  "star-road-console": ["plaza-3190-2f666bb6070b"],
  "star-road-light": ["plaza-3190-bb8e6e65066c"],
  "star-road-multiplayer": ["plaza-3190-ee01eeb04473"],
  "sm64-multiplayer-dynamic": ["plaza-3192-30f6c999e5a9"],
  "sm64-multiplayer-classic": ["plaza-3192-6d4318d4d709"],
  "goldeneye-mord-weapons-x": ["rhdn-hacks-4467-3081be6a4420", "rhdn-hacks-4467-340cffa5e978"],
  "goldeneye-mord-weapons": ["rhdn-hacks-4467-1a2151c084fa", "rhdn-hacks-4467-f307407aaa99"],
};
for (const entry of allEntries) {
  let project = Object.entries(editionGroups).find(([, ids]) => ids.includes(entry.id))?.[0];
  if (entry.id.startsWith("rhdn-hacks-5959-")) project = "star-road-console";
  if (entry.id.startsWith("rhdn-hacks-5541-")) project = /light/i.test(entry.name) ? "goldeneye-unlock-light" : "goldeneye-unlock-all";
  if (entry.id.startsWith("rhdn-hacks-6148-")) project = `hooting-hud-${/P([1-4])/i.exec(entry.patch.archiveMember)?.[1]}`;
  if (entry.id.startsWith("rhdn-hacks-5671-")) project = /luigi/i.test(entry.name) ? "low-poly-luigi" : "low-poly-mario";
  if (entry.id.startsWith("plaza-2122-")) project = /Master Quest/.test(entry.name) ? "master-quest-redux" : "oot-redux";
  if (entry.id.startsWith("plaza-2123-")) project = "mm-redux";
  if (project) {
    const release = entry.version === "All" ? /1\.01/.test(entry.name) ? "1.01" : "edition" : entry.version;
    groups[entry.id] = { projectId: project, releaseId: `release-${entry.output.sha256.toLowerCase().slice(0, 20)}`, releaseOrder: release === "1.02" ? 10200 : release === "1.01" ? 10100 : 0 };
    // Preserve rank of an explicitly curated equivalent release across sources.
    const equivalent = allEntries.find(other => other.id !== entry.id && other.output.sha256.toLowerCase() === entry.output.sha256.toLowerCase() && groups[other.id]?.projectId === project);
    if (equivalent) groups[entry.id] = { ...groups[equivalent.id] };
  }
}
const audit = [];
for (const [key, records] of names) {
  if (records.length < 2) continue;
  // Preserve already curated edition distinctions and flag unresolved multi-edition projects.
  const editions = new Set(records.map(r => groups[r.entry.id]?.projectId).filter(Boolean));
  const ambiguous = /supermariostarroad|supermario64multiplayer|lowpolypromomodels|hootinghud|goldeneyeunlockeverything|mordscustom/.test(key);
  if (ambiguous || editions.size > 1) {
    audit.push({ game: records[0].entry.base.name, name: records[0].title, status: "edition-review", entries: records.map(r => r.entry.id) });
    continue;
  }
  const projectId = [...editions][0] || `project-${createHash("sha256").update(key).digest("hex").slice(0, 16)}`;
  for (const { entry } of records) {
    if (groups[entry.id]) continue;
    const numeric = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:h(\d+))?$/.exec(entry.version);
    const order = numeric ? +numeric[1] * 1000000 + +(numeric[2] || 0) * 10000 + +(numeric[3] || 0) * 100 + +(numeric[4] || 0) : 0;
    groups[entry.id] = { projectId, releaseId: `release-${entry.output.sha256.toLowerCase().slice(0, 20)}`, releaseOrder: order };
  }
  audit.push({ game: records[0].entry.base.name, name: records[0].title, status: "grouped", projectId, entries: records.map(r => r.entry.id) });
}
// Confirmed same project with spelling differences across publishers.
for (const id of ["hylian-zelda64_dawn_and_dusk", "rhdn-hacks-5816-beee8813fc94", "rhdn-hacks-5816-96dad672227b", "rhdn-hacks-5816-b2c53feafe04"]) {
  groups[id] = { projectId: "zelda64-dawn-and-dusk", releaseId: "dawn-dusk-v2", releaseOrder: 2000000 };
}
for (const project of audit) {
  if (project.entries.every(id => groups[id])) {
    project.status = "curated";
    project.projectIds = [...new Set(project.entries.map(id => groups[id].projectId))];
    delete project.projectId;
  }
}
await writeFile(new URL("../sources/release-groups.json", import.meta.url), JSON.stringify(groups, null, 2) + "\n");
await writeFile(new URL("../sources/project-group-audit.json", import.meta.url), JSON.stringify({ notice: "Same-game normalized project-name audit; edition-review items remain separate until curated.", projects: audit }, null, 2) + "\n");
console.log({ curated: audit.filter(x => x.status === "curated").length, editionReview: audit.filter(x => x.status === "edition-review").length, entries: Object.keys(groups).length });
