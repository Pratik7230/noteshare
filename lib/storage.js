import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { put, del, get } from "@vercel/blob";

const ROOT = path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR || "./uploads");

// Default to "private" (matching modern Vercel Blob stores), or "public" if BLOB_ACCESS=public.
let currentBlobAccess = process.env.BLOB_ACCESS || "private";

const safe = (key) => {
  const p = path.resolve(ROOT, key);
  if (!p.startsWith(ROOT + path.sep)) throw new Error("Bad storage key");
  return p;
};

/**
 * Checks whether a key is an absolute HTTP/HTTPS URL (e.g. Vercel Blob URL).
 */
export function isRemoteUrl(keyOrUrl) {
  return typeof keyOrUrl === "string" && /^https?:\/\//i.test(keyOrUrl);
}

/**
 * Checks if Vercel Blob storage is configured and active.
 */
export function hasVercelBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/**
 * Returns current access mode for Vercel Blob operations ('private' or 'public').
 */
export function getBlobAccess() {
  return currentBlobAccess;
}

/**
 * Storage namespace helpers to ensure organized, collision-free paths.
 * Both Note Images/Attachments and Profile Pictures share the same bucket.
 */
export const storagePaths = {
  /**
   * Path for note attachments & editor images.
   * Format: attachments/<noteId>/<uuid>-<filename>
   */
  attachment(noteId, filename = "file") {
    const clean = filename.replace(/[^\w.\- ]+/g, "_").slice(0, 100) || "file";
    return `attachments/${noteId}/${randomUUID()}-${clean}`;
  },

  /**
   * Path for future user profile pictures / avatars.
   * Format: profiles/<userId>/<uuid>-<filename>
   */
  profile(userId, filename = "avatar.png") {
    const clean = filename.replace(/[^\w.\- ]+/g, "_").slice(0, 100) || "avatar.png";
    return `profiles/${userId}/${randomUUID()}-${clean}`;
  },
};

/**
 * Uploads a file buffer to storage (Vercel Blob if configured, otherwise local disk).
 * Automatically handles both Private and Public Vercel Blob stores.
 *
 * @param {string} key - Relative storage path (e.g., from storagePaths.attachment / storagePaths.profile)
 * @param {Buffer | Uint8Array} buffer - File data
 * @param {object} [options]
 * @param {string} [options.contentType] - MIME type (e.g. image/png, application/pdf)
 * @returns {Promise<{ storageKey: string, url: string, pathname: string }>}
 */
export async function putObject(key, buffer, options = {}) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (token) {
    let access = process.env.BLOB_ACCESS || currentBlobAccess;
    let blob;

    try {
      blob = await put(key, buffer, {
        access,
        token,
        contentType: options.contentType,
        addRandomSuffix: false, // keys already include randomUUID
      });
    } catch (err) {
      // Auto-switch between private and public store configurations
      if (err.message?.includes("private store") || err.message?.includes("Cannot use public access")) {
        currentBlobAccess = "private";
        blob = await put(key, buffer, {
          access: "private",
          token,
          contentType: options.contentType,
          addRandomSuffix: false,
        });
      } else if (err.message?.includes("public store") || err.message?.includes("Cannot use private access")) {
        currentBlobAccess = "public";
        blob = await put(key, buffer, {
          access: "public",
          token,
          contentType: options.contentType,
          addRandomSuffix: false,
        });
      } else {
        throw err;
      }
    }

    return {
      storageKey: blob.url,
      url: blob.url,
      pathname: blob.pathname,
    };
  }

  // Local filesystem fallback
  const filePath = safe(key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, buffer);

  return {
    storageKey: key,
    url: `/uploads/${key}`,
    pathname: key,
  };
}

/**
 * Retrieves a file stream (or buffer) for high-performance streaming.
 * Supports private/public Vercel Blob and local filesystem paths.
 *
 * @param {string} keyOrUrl
 * @returns {Promise<{ stream?: ReadableStream, buffer?: Buffer, contentType?: string }>}
 */
export async function getObjectStream(keyOrUrl) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (token && isRemoteUrl(keyOrUrl)) {
    let access = process.env.BLOB_ACCESS || currentBlobAccess;
    try {
      const res = await get(keyOrUrl, { access, token });
      if (res?.stream) {
        return {
          stream: res.stream,
          contentType: res.blob?.contentType,
        };
      }
    } catch (err) {
      // If store is public vs private mismatch, try opposite access mode
      const fallback = access === "private" ? "public" : "private";
      try {
        const res = await get(keyOrUrl, { access: fallback, token });
        if (res?.stream) {
          currentBlobAccess = fallback;
          return {
            stream: res.stream,
            contentType: res.blob?.contentType,
          };
        }
      } catch {
        throw err;
      }
    }
  }

  // Local filesystem fallback
  const buffer = await readFile(safe(keyOrUrl));
  return { buffer };
}

/**
 * Retrieves file contents as a Buffer.
 * Supports both Vercel Blob (private/public) and local filesystem paths.
 *
 * @param {string} keyOrUrl
 * @returns {Promise<Buffer>}
 */
export async function getObject(keyOrUrl) {
  const result = await getObjectStream(keyOrUrl);
  if (result.buffer) return result.buffer;
  if (result.stream) {
    const ab = await new Response(result.stream).arrayBuffer();
    return Buffer.from(ab);
  }
  throw new Error("Unable to retrieve file data");
}

/**
 * Deletes a file from storage.
 * Works transparently with both Vercel Blob URLs and local filesystem paths.
 *
 * @param {string} keyOrUrl
 * @returns {Promise<void>}
 */
export async function removeObject(keyOrUrl) {
  if (!keyOrUrl) return;

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (isRemoteUrl(keyOrUrl)) {
    try {
      await del(keyOrUrl, { token });
      return;
    } catch (err) {
      console.warn("[storage] Failed to delete blob:", err.message);
    }
  }

  try {
    await unlink(safe(keyOrUrl));
  } catch {}
}

/**
 * Helper for user profile pictures (future feature).
 * Uploads an avatar image into the shared blob store under the `profiles/` namespace.
 *
 * @param {string} userId
 * @param {Buffer | Uint8Array} buffer
 * @param {string} mimeType
 * @param {string} [filename="avatar.png"]
 * @returns {Promise<{ storageKey: string, url: string, pathname: string }>}
 */
export async function uploadProfilePicture(userId, buffer, mimeType, filename = "avatar.png") {
  const key = storagePaths.profile(userId, filename);
  return putObject(key, buffer, { contentType: mimeType });
}

/**
 * Helper to remove an existing profile picture from the shared blob store.
 *
 * @param {string} avatarUrlOrKey
 * @returns {Promise<void>}
 */
export async function deleteProfilePicture(avatarUrlOrKey) {
  return removeObject(avatarUrlOrKey);
}
