import { readFile, writeFile } from "node:fs/promises";
const merged = Object.assign({}, ...await Promise.all(process.argv.slice(2).map(async path => JSON.parse(await readFile(path, "utf8")))));
const result = Object.fromEntries(Object.entries(merged).filter(([, value]) => Number.isSafeInteger(value.size) && value.size > 0));
await writeFile(new URL("../sources/output-sizes.json", import.meta.url), JSON.stringify(result, null, 2) + "\n");
console.log(`Imported ${Object.keys(result).length} output-size records`);
