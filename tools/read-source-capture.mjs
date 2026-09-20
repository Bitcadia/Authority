import { readFile } from "node:fs/promises";

// Historical browser export rdhn.json is Windows-1252; newer captures are UTF-8.
// Decode strictly first so legacy names are not silently replaced with U+FFFD.
export function decodeSourceCapture(bytes) {
  try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { return new TextDecoder("windows-1252", { fatal: true }).decode(bytes); }
}
export async function readSourceCapture(path) {
  return decodeSourceCapture(await readFile(path));
}
