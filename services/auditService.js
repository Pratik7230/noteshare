import { getDb } from "../lib/db.js";
import { AuditLog } from "../entities/index.js";

/** Records an admin action. Never throws: a logging failure must not block the action. */
export async function audit(admin, action, targetType = null, targetId = null, meta = null) {
  try {
    await (await getDb()).getRepository(AuditLog).insert({
      adminId: admin.id, adminEmail: admin.email, action, targetType, targetId: targetId ? String(targetId) : null, meta,
    });
  } catch (e) { console.error("[audit] failed", e.message); }
}
