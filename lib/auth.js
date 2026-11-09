import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "ns_token";
const secret = () => {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 24) throw new Error("JWT_SECRET must be set (24+ chars)");
  return new TextEncoder().encode(s);
};

export async function signToken(payload, expiresIn = "7d") {
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(expiresIn).sign(secret());
}
export async function verifyToken(token) {
  try { return (await jwtVerify(token, secret())).payload; } catch { return null; }
}

export async function setAuthCookie(userId) {
  const token = await signToken({ sub: userId }, process.env.JWT_EXPIRES_IN || "7d");
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, sameSite: "lax", path: "/",
    secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 7,
  });
}
export async function clearAuthCookie() { (await cookies()).delete(COOKIE); }

/** Returns the user id from the auth cookie, or null. */
export async function getUserId() {
  const t = (await cookies()).get(COOKIE)?.value;
  if (!t) return null;
  const p = await verifyToken(t);
  return p?.sub || null;
}

// Short-lived cookie proving a password-protected note was unlocked.
export async function setUnlockCookie(noteId) {
  const token = await signToken({ unlock: noteId }, "12h");
  (await cookies()).set(`np_${noteId.slice(0, 8)}`, token, {
    httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 12,
  });
}
export async function isUnlocked(noteId) {
  const t = (await cookies()).get(`np_${noteId.slice(0, 8)}`)?.value;
  if (!t) return false;
  const p = await verifyToken(t);
  return p?.unlock === noteId;
}
