import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";

// Storage driver interface: put/get/remove. Local disk by default.
// To use S3/R2, implement the same three functions and switch on STORAGE_DRIVER.
const ROOT = path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR || "./uploads");
const safe = (key) => {
  const p = path.resolve(ROOT, key);
  if (!p.startsWith(ROOT + path.sep)) throw new Error("Bad storage key");
  return p;
};
export async function putObject(key, buffer) { await mkdir(path.dirname(safe(key)), { recursive: true }); await writeFile(safe(key), buffer); }
export async function getObject(key) { return readFile(safe(key)); }
export async function removeObject(key) { try { await unlink(safe(key)); } catch {} }
