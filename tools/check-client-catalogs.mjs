#!/usr/bin/env node
// Acceptance gate using a helper compiled from Bitcadia64's actual parsers.
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
const helper = resolve(process.argv[2]);
const output = resolve(process.argv[3]);
let checked = 0;
for (const provider of ["rhdc", "hylian", "sm64", "smashremix"]) {
  const directory = resolve(output, `sites/${provider}/catalog`);
  for (const name of await readdir(directory)) {
    const path = resolve(directory, name);
    const document = JSON.parse(await readFile(path));
    execFileSync(helper, [document.games ? "index" : "list", path], { stdio: "inherit" });
    checked++;
  }
}
console.log(`Bitcadia64 accepted ${checked} generated catalog documents`);
