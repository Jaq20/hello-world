import "server-only";
import fs from "fs/promises";
import path from "path";

// Image bytes are stored on the filesystem (cheap, keeps the database tiny).
// Swap this single module for S3 / Cloudflare R2 / etc. to scale out — the
// rest of the app only depends on these three functions and opaque keys.
const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

// Resolve a storage key to an absolute path, refusing anything that isn't a
// plain filename (defense-in-depth against path traversal).
function resolveKey(key: string): string {
  const base = path.basename(key);
  if (!base || base !== key) throw new Error("Invalid storage key");
  return path.join(UPLOAD_DIR, base);
}

export async function saveFile(key: string, data: Buffer): Promise<void> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(resolveKey(key), data);
}

export async function readFile(key: string): Promise<Buffer> {
  return fs.readFile(resolveKey(key));
}

export async function deleteFile(key: string): Promise<void> {
  await fs.unlink(resolveKey(key)).catch(() => {});
}
