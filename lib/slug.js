import { randomInt } from "node:crypto";

const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"; // no look-alikes
export const RESERVED_SLUGS = new Set([
  "api", "n", "new", "login", "logout", "register", "signup", "dashboard",
  "settings", "admin", "about", "privacy", "terms", "help", "static",
  "_next", "favicon.ico", "robots.txt", "sitemap.xml", "manifest.json",
  "trash", "archive", "starred", "shared", "templates", "u", "me",
]);

/** Cryptographically secure random slug. */
export function randomSlug(length = 9) {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])$/;

export function validateCustomSlug(slug) {
  const s = String(slug || "").toLowerCase();
  if (!SLUG_PATTERN.test(s)) return { ok: false, reason: "Use 3-64 letters, numbers or hyphens." };
  if (RESERVED_SLUGS.has(s)) return { ok: false, reason: "That address is reserved." };
  if (UUID_RE.test(s)) return { ok: false, reason: "Choose a different address." };
  return { ok: true, slug: s };
}
