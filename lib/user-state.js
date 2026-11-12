import { getDb } from "./db.js";

// Short-lived cache so bans and role changes apply quickly without a DB hit on every request.
const cache = new Map();
const TTL = 30_000;

export async function getUserState(userId, { fresh = false } = {}) {
  const hit = cache.get(userId);
  if (!fresh && hit && Date.now() - hit.at < TTL) return hit.state;
  const rows = await (await getDb()).query(`SELECT role, suspended_at, suspended_reason FROM users WHERE id = $1`, [userId]);
  const r = rows[0];
  const state = r ? { role: r.role, suspended: !!r.suspended_at, reason: r.suspended_reason } : null;
  cache.set(userId, { at: Date.now(), state });
  return state;
}
export const invalidateUserState = (userId) => cache.delete(userId);
