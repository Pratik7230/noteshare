import { createHash, randomBytes } from "node:crypto";

export const sha256 = (s) => createHash("sha256").update(String(s)).digest("hex");
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

/** Privacy-conscious visitor id: salted hash of ip + user agent + day. No raw IPs stored. */
export function visitorHash(ip, ua) {
  const day = new Date().toISOString().slice(0, 10);
  return sha256(`${process.env.VISITOR_HASH_SALT || "dev"}|${ip}|${ua}|${day}`);
}
