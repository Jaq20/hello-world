import "server-only";
import fs from "fs/promises";
import path from "path";

// All blob I/O goes through this module so the rest of the app never touches a
// concrete backend. Switch backends with STORAGE_DRIVER — no call sites change.
//
//   STORAGE_DRIVER=local     -> filesystem under UPLOAD_DIR (default; dev)
//   STORAGE_DRIVER=supabase  -> Supabase Storage (private bucket; production)
//
// Image bytes never live in the database, only opaque keys + metadata do, so
// database storage cost stays minimal regardless of photo volume.

export interface StorageDriver {
  save(key: string, data: Buffer, contentType: string): Promise<void>;
  read(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}

// --- Local filesystem driver -------------------------------------------------

const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

// Refuse anything that isn't a plain filename (defense-in-depth vs traversal).
function safeLocalPath(key: string): string {
  const base = path.basename(key);
  if (!base || base !== key) throw new Error("Invalid storage key");
  return path.join(UPLOAD_DIR, base);
}

const localDriver: StorageDriver = {
  async save(key, data) {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(safeLocalPath(key), data);
  },
  async read(key) {
    return fs.readFile(safeLocalPath(key));
  },
  async remove(key) {
    await fs.unlink(safeLocalPath(key)).catch(() => {});
  },
};

// --- Supabase Storage driver (private bucket, S3-style REST) -----------------

function supabaseDriver(): StorageDriver {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "deal-photos";
  if (!url || !serviceKey) {
    throw new Error(
      "STORAGE_DRIVER=supabase requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  const objectUrl = (key: string) =>
    `${url}/storage/v1/object/${bucket}/${encodeURIComponent(key)}`;
  const auth = { Authorization: `Bearer ${serviceKey}` };

  return {
    async save(key, data, contentType) {
      const res = await fetch(objectUrl(key), {
        method: "POST",
        headers: { ...auth, "Content-Type": contentType, "x-upsert": "true" },
        body: new Uint8Array(data),
      });
      if (!res.ok) throw new Error(`Supabase upload failed: ${res.status}`);
    },
    async read(key) {
      const res = await fetch(objectUrl(key), { headers: auth });
      if (!res.ok) throw new Error(`Supabase read failed: ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    },
    async remove(key) {
      await fetch(objectUrl(key), { method: "DELETE", headers: auth }).catch(
        () => {},
      );
    },
  };
}

// --- Selection ---------------------------------------------------------------

let driver: StorageDriver | null = null;
function getDriver(): StorageDriver {
  if (driver) return driver;
  driver =
    process.env.STORAGE_DRIVER === "supabase" ? supabaseDriver() : localDriver;
  return driver;
}

export async function saveFile(
  key: string,
  data: Buffer,
  contentType: string,
): Promise<void> {
  return getDriver().save(key, data, contentType);
}

export async function readFile(key: string): Promise<Buffer> {
  return getDriver().read(key);
}

export async function deleteFile(key: string): Promise<void> {
  return getDriver().remove(key);
}
