import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
if (!process.argv[2]) throw Error("usage: sync-client-schemas.mjs BITCADIA64_ROOT");
for (const name of ["mod-registry.schema.json", "mod-registry-index.schema.json"]) {
  const bytes = await readFile(resolve(process.argv[2], "schemas", name));
  JSON.parse(bytes);
  await writeFile(new URL(`../schemas/${name}`, import.meta.url), bytes);
}
