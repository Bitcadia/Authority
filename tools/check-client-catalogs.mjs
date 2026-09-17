#!/usr/bin/env node
// Acceptance gate using a helper compiled from Bitcadia64's actual parsers.
import { readdir, readFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
const helper = resolve(process.argv[2]);
const output = resolve(process.argv[3]);
let checked = 0;
const outputs = new Map();
const pairs = [];
for (const provider of ["rhdc", "hylian", "sm64", "smashremix"]) {
  const directory = resolve(output, `sites/${provider}/catalog`);
  for (const name of await readdir(directory)) {
    const path = resolve(directory, name);
    const document = JSON.parse(await readFile(path));
    execFileSync(helper, [document.games ? "index" : "list", path], { stdio: "inherit" });
    for (const entry of document.entries || []) {
      const current = { entrySha256: entry.entrySha256, outputSha256: entry.output.sha256 };
      const previous = outputs.get(current.outputSha256) || [];
      for (const other of previous) pairs.push({ left: other, right: current });
      previous.push(current);
      outputs.set(current.outputSha256, previous);
    }
    checked++;
  }
}
const temporary = await mkdtemp(resolve(tmpdir(), "authority-release-pairs-"));
try {
  const path = resolve(temporary, "pairs.json");
  await writeFile(path, JSON.stringify(pairs));
  execFileSync(helper, ["release-pairs", path], { stdio: "inherit" });
} finally {
  await rm(temporary, { recursive: true });
}
console.log(`Bitcadia64 accepted ${checked} generated catalog documents`);
