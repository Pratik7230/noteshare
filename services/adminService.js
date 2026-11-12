import { getDb } from "../lib/db.js";
import { badRequest, conflict, forbidden, notFound } from "../lib/errors.js";
import { invalidateUserState } from "../lib/user-state.js";
import { removeObject } from "../lib/storage.js";
import { stripHtml } from "../lib/sanitize.js";
import { UUID_RE } from "../lib/slug.js";
import { audit } from "./auditService.js";
import { authService, avatarUrlFor, sendVerification } from "./authService.js";
import { noteService, loadReadable } from "./noteService.js";
import { profileService } from "./profileService.js";
import { getSettings, saveSettings } from "./siteSettingsService.js";
import { runCleanup } from "./cleanupService.js";
import { userRepository } from "../repositories/userRepository.js";

const esc = (s) => s.replace(/[\\%_]/g, (c) => "\\" + c);
const page = (q, size) => {
  const limit = size, p = Math.max(parseInt(q.page) || 1, 1);
  return { limit, offset: (p - 1) * limit, page: p };
};
const dir = (q) => (q.order === "asc" ? "ASC" : "DESC");

/** Small helper to build parameterized WHERE clauses. */
function where() {
  const parts = [], params = [];
  return {
    add(sql, ...vals) { // use ? placeholders, replaced with $n
      let i = 0;
      parts.push(sql.replace(/\?/g, () => { params.push(vals[i++]); return `$${params.length}`; }));
    },
    get sql() { return parts.length ? `WHERE ${parts.join(" AND ")}` : ""; },
    params,
  };
}

const userRow = (r) => ({
  id: r.id, name: r.name, email: r.email, role: r.role, emailVerified: r.email_verified,
  suspendedAt: r.suspended_at, suspendedReason: r.suspended_reason, createdAt: r.created_at, lastLoginAt: r.last_login_at,
  noteCount: Number(r.note_count ?? 0), avatarUrl: avatarUrlFor({ id: r.id, avatarUpdatedAt: r.avatar_updated_at }), bio: r.bio || "",
});

export const adminService = {
  // ---------------- overview ----------------
  async stats() {
    const db = await getDb();
    const [s] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM users) AS total_users,
        (SELECT COUNT(*) FROM users WHERE created_at > now() - interval '7 days') AS new_users_7d,
        (SELECT COUNT(*) FROM users WHERE email_verified) AS verified_users,
        (SELECT COUNT(*) FROM users WHERE suspended_at IS NOT NULL) AS suspended_users,
        (SELECT COUNT(*) FROM users WHERE role = 'admin') AS admins,
        (SELECT COUNT(*) FROM notes WHERE NOT is_deleted) AS total_notes,
        (SELECT COUNT(*) FROM notes WHERE NOT is_deleted AND created_at > now() - interval '7 days') AS new_notes_7d,
        (SELECT COUNT(*) FROM notes WHERE NOT is_deleted AND owner_id IS NULL) AS anonymous_notes,
        (SELECT COUNT(*) FROM notes WHERE NOT is_deleted AND privacy = 'public') AS public_notes,
        (SELECT COUNT(*) FROM notes WHERE NOT is_deleted AND privacy = 'private') AS private_notes,
        (SELECT COUNT(*) FROM notes WHERE NOT is_deleted AND password_hash IS NOT NULL) AS protected_notes,
        (SELECT COUNT(*) FROM notes WHERE NOT is_deleted AND expires_at IS NOT NULL) AS expiring_notes,
        (SELECT COUNT(*) FROM notes WHERE is_deleted) AS trashed_notes,
        (SELECT COUNT(*) FROM notes WHERE disabled_at IS NOT NULL) AS disabled_notes,
        (SELECT COALESCE(SUM(view_count), 0) FROM notes) AS total_views,
        (SELECT COUNT(*) FROM note_attachments) AS attachments,
        (SELECT COALESCE(SUM(size), 0) FROM note_attachments) AS storage_bytes,
        (SELECT COUNT(*) FROM note_reports WHERE status = 'open') AS open_reports`);
    const series = await db.query(`
      SELECT to_char(d::date, 'YYYY-MM-DD') AS day,
             (SELECT COUNT(*) FROM users WHERE created_at::date = d::date) AS users,
             (SELECT COUNT(*) FROM notes WHERE created_at::date = d::date) AS notes
      FROM generate_series(current_date - 29, current_date, interval '1 day') d ORDER BY d`);
    const top = await db.query(`SELECT id, title, slug, view_count FROM notes WHERE NOT is_deleted ORDER BY view_count DESC LIMIT 5`);
    const out = Object.fromEntries(Object.entries(s).map(([k, v]) => [k, Number(v)]));
    return {
      totals: out,
      series: series.map((r) => ({ day: r.day, users: Number(r.users), notes: Number(r.notes) })),
      topNotes: top.map((r) => ({ id: r.id, title: r.title, slug: r.slug, views: r.view_count })),
    };
  },

  // ---------------- users ----------------
  async listUsers(q) {
    const db = await getDb();
    const w = where();
    if (q.q) w.add(`(u.name ILIKE ? OR u.email ILIKE ?)`, `%${esc(q.q)}%`, `%${esc(q.q)}%`);
    if (["user", "admin"].includes(q.role)) w.add(`u.role = ?`, q.role);
    if (q.status === "suspended") w.add(`u.suspended_at IS NOT NULL`);
    if (q.status === "active") w.add(`u.suspended_at IS NULL`);
    if (q.verified === "yes") w.add(`u.email_verified = true`);
    if (q.verified === "no") w.add(`u.email_verified = false`);
    const sort = { createdAt: "u.created_at", lastLogin: "u.last_login_at", name: "lower(u.name)", email: "u.email", notes: "note_count" }[q.sort] || "u.created_at";
    const { limit, offset, page: pg } = page(q, 25);
    const [{ count }] = await db.query(`SELECT COUNT(*) FROM users u ${w.sql}`, w.params);
    const rows = await db.query(
      `SELECT u.*, (SELECT COUNT(*) FROM notes n WHERE n.owner_id = u.id) AS note_count FROM users u ${w.sql}
       ORDER BY ${sort} ${dir(q)} NULLS LAST LIMIT ${limit} OFFSET ${offset}`, w.params);
    return { items: rows.map(userRow), total: Number(count), page: pg, limit };
  },

  async getUser(id) {
    if (!UUID_RE.test(id)) throw notFound("User not found");
    const db = await getDb();
    const [r] = await db.query(`SELECT u.*, (SELECT COUNT(*) FROM notes n WHERE n.owner_id = u.id) AS note_count FROM users u WHERE u.id = $1`, [id]);
    if (!r) throw notFound("User not found");
    const [st] = await db.query(
      `SELECT COALESCE(SUM(view_count),0) AS views,
              (SELECT COUNT(*) FROM note_attachments a JOIN notes n ON n.id = a.note_id WHERE n.owner_id = $1) AS attachments,
              (SELECT COALESCE(SUM(a.size),0) FROM note_attachments a JOIN notes n ON n.id = a.note_id WHERE n.owner_id = $1) AS storage
       FROM notes WHERE owner_id = $1`, [id]);
    const recent = await db.query(`SELECT id, title, slug, privacy, updated_at, is_deleted, disabled_at FROM notes WHERE owner_id = $1 ORDER BY updated_at DESC LIMIT 8`, [id]);
    return {
      ...userRow(r),
      stats: { views: Number(st.views), attachments: Number(st.attachments), storageBytes: Number(st.storage) },
      recentNotes: recent.map((n) => ({ id: n.id, title: n.title, slug: n.slug, privacy: n.privacy, updatedAt: n.updated_at, isDeleted: n.is_deleted, isDisabled: !!n.disabled_at })),
    };
  },

  async userAction(admin, id, input) {
    const target = await userRepository.findById(id);
    if (!target) throw notFound("User not found");
    const self = target.id === admin.id;
    const log = (action, meta) => audit(admin, action, "user", id, { email: target.email, ...meta });

    switch (input.action) {
      case "suspend":
        if (self) throw forbidden("You can't suspend yourself");
        if (target.role === "admin") throw forbidden("Demote this admin before suspending them");
        await userRepository.update(id, { suspendedAt: new Date(), suspendedReason: input.reason });
        await log("user.suspend", { reason: input.reason });
        break;
      case "unsuspend":
        await userRepository.update(id, { suspendedAt: null, suspendedReason: null });
        await log("user.unsuspend");
        break;
      case "setRole":
        if (self) throw forbidden("You can't change your own role");
        if (input.role === "admin" && !target.emailVerified) throw badRequest("Verify this user's email before making them an admin");
        await userRepository.update(id, { role: input.role });
        await log("user.setRole", { role: input.role });
        break;
      case "verifyEmail":
        await userRepository.update(id, { emailVerified: true, emailVerifyTokenHash: null });
        await log("user.verifyEmail");
        break;
      case "sendReset":
        await authService.forgotPassword(target.email);
        await log("user.sendPasswordReset");
        break;
      case "resendVerification":
        if (target.emailVerified) throw badRequest("Email is already verified");
        await sendVerification(target);
        await log("user.resendVerification");
        break;
    }
    invalidateUserState(id);
    return this.getUser(id);
  },

  async deleteUser(admin, id) {
    const target = await userRepository.findById(id);
    if (!target) throw notFound("User not found");
    if (target.id === admin.id) throw forbidden("You can't delete your own account here. Use Account settings.");
    if (target.role === "admin") throw forbidden("Demote this admin before deleting them");
    await profileService.purgeUser(id);
    invalidateUserState(id);
    await audit(admin, "user.delete", "user", id, { email: target.email, name: target.name });
  },

  // ---------------- notes ----------------
  async listNotes(q) {
    const db = await getDb();
    const w = where();
    if (q.q) w.add(`(n.title ILIKE ? OR n.slug ILIKE ? OR u.email ILIKE ?)`, `%${esc(q.q)}%`, `%${esc(q.q)}%`, `%${esc(q.q)}%`);
    if (["public", "unlisted", "private"].includes(q.privacy)) w.add(`n.privacy = ?`, q.privacy);
    if (q.owner === "anonymous") w.add(`n.owner_id IS NULL`);
    if (q.owner === "owned") w.add(`n.owner_id IS NOT NULL`);
    if (q.password === "yes") w.add(`n.password_hash IS NOT NULL`);
    if (q.state === "active") w.add(`NOT n.is_deleted AND n.disabled_at IS NULL AND (n.expires_at IS NULL OR n.expires_at > now())`);
    if (q.state === "deleted") w.add(`n.is_deleted`);
    if (q.state === "disabled") w.add(`n.disabled_at IS NOT NULL`);
    if (q.state === "expired") w.add(`n.expires_at IS NOT NULL AND n.expires_at <= now()`);
    if (q.state === "reported") w.add(`EXISTS (SELECT 1 FROM note_reports r WHERE r.note_id = n.id AND r.status = 'open')`);
    const sort = { updatedAt: "n.updated_at", createdAt: "n.created_at", views: "n.view_count", size: "octet_length(n.content)" }[q.sort] || "n.updated_at";
    const { limit, offset, page: pg } = page(q, 25);
    const from = `FROM notes n LEFT JOIN users u ON u.id = n.owner_id ${w.sql}`;
    const [{ count }] = await db.query(`SELECT COUNT(*) ${from}`, w.params);
    const rows = await db.query(
      `SELECT n.id, n.title, n.slug, n.privacy, n.view_count, n.is_deleted, n.disabled_at, n.disabled_reason, n.expires_at,
              n.created_at, n.updated_at, (n.password_hash IS NOT NULL) AS has_password, octet_length(n.content) AS size,
              u.id AS owner_id, u.email AS owner_email, u.name AS owner_name,
              (SELECT COUNT(*) FROM note_reports r WHERE r.note_id = n.id AND r.status = 'open') AS open_reports
       ${from} ORDER BY ${sort} ${dir(q)} LIMIT ${limit} OFFSET ${offset}`, w.params);
    return {
      total: Number(count), page: pg, limit,
      items: rows.map((r) => ({
        id: r.id, title: r.title, slug: r.slug, privacy: r.privacy, views: r.view_count, isDeleted: r.is_deleted,
        disabledAt: r.disabled_at, disabledReason: r.disabled_reason, expiresAt: r.expires_at, createdAt: r.created_at, updatedAt: r.updated_at,
        hasPassword: r.has_password, size: Number(r.size), ownerId: r.owner_id, ownerEmail: r.owner_email, ownerName: r.owner_name,
        openReports: Number(r.open_reports),
      })),
    };
  },

  async getNote(admin, id, { content }) {
    if (!UUID_RE.test(id)) throw notFound("Note not found");
    const db = await getDb();
    const [n] = await db.query(
      `SELECT n.*, u.email AS owner_email, u.name AS owner_name, octet_length(n.content) AS size,
              (SELECT COUNT(*) FROM note_versions v WHERE v.note_id = n.id) AS versions,
              (SELECT COUNT(DISTINCT visitor_hash) FROM note_views v WHERE v.note_id = n.id) AS unique_views
       FROM notes n LEFT JOIN users u ON u.id = n.owner_id WHERE n.id = $1`, [id]);
    if (!n) throw notFound("Note not found");
    const attachments = await db.query(`SELECT id, filename, mime_type, size FROM note_attachments WHERE note_id = $1 ORDER BY created_at`, [id]);
    const reports = await db.query(
      `SELECT r.id, r.reason, r.details, r.status, r.created_at, u.email AS reporter_email FROM note_reports r LEFT JOIN users u ON u.id = r.reporter_id WHERE r.note_id = $1 ORDER BY r.created_at DESC LIMIT 20`, [id]);
    let excerpt = null;
    if (content) {
      const text = n.content_type === "rich" ? stripHtml(n.content) : n.content;
      excerpt = text.slice(0, 6000);
      await audit(admin, "note.viewContent", "note", id, { slug: n.slug });
    }
    return {
      id: n.id, title: n.title, slug: n.slug, contentType: n.content_type, privacy: n.privacy, sharePermission: n.share_permission,
      hasPassword: !!n.password_hash, ownerId: n.owner_id, ownerEmail: n.owner_email, ownerName: n.owner_name,
      views: n.view_count, uniqueViews: Number(n.unique_views), versions: Number(n.versions), size: Number(n.size),
      isDeleted: n.is_deleted, disabledAt: n.disabled_at, disabledReason: n.disabled_reason, expiresAt: n.expires_at,
      createdAt: n.created_at, updatedAt: n.updated_at, maxViews: n.max_views,
      attachments: attachments.map((a) => ({ id: a.id, filename: a.filename, mimeType: a.mime_type, size: a.size })),
      reports: reports.map((r) => ({ id: r.id, reason: r.reason, details: r.details, status: r.status, createdAt: r.created_at, reporterEmail: r.reporter_email })),
      excerpt,
    };
  },

  async noteAction(admin, id, input) {
    const db = await getDb();
    const [n] = await db.query(`SELECT id, slug, owner_id FROM notes WHERE id = $1`, [id]);
    if (!n) throw notFound("Note not found");
    const run = (sql, params = []) => db.query(sql, [id, ...params]);
    switch (input.action) {
      case "disable": await run(`UPDATE notes SET disabled_at = now(), disabled_reason = $2 WHERE id = $1`, [input.reason]); break;
      case "enable": await run(`UPDATE notes SET disabled_at = NULL, disabled_reason = NULL WHERE id = $1`); break;
      case "restore": await run(`UPDATE notes SET is_deleted = false, deleted_at = NULL WHERE id = $1`); break;
      case "trash": await run(`UPDATE notes SET is_deleted = true, deleted_at = now() WHERE id = $1`); break;
      case "setPrivacy":
        if (input.privacy === "private" && !n.owner_id) throw badRequest("Anonymous notes can't be private. Disable the note instead.");
        await run(`UPDATE notes SET privacy = $2 WHERE id = $1`, [input.privacy]); break;
      case "removePassword": await run(`UPDATE notes SET password_hash = NULL WHERE id = $1`); break;
      case "clearExpiry": await run(`UPDATE notes SET expires_at = NULL WHERE id = $1`); break;
    }
    await audit(admin, `note.${input.action}`, "note", id, { slug: n.slug, ...(input.reason ? { reason: input.reason } : {}), ...(input.privacy ? { privacy: input.privacy } : {}) });
  },

  async deleteNote(admin, id) {
    const [n] = await (await getDb()).query(`SELECT slug FROM notes WHERE id = $1`, [id]);
    if (!n) throw notFound("Note not found");
    await noteService.hardDelete(id);
    await audit(admin, "note.delete", "note", id, { slug: n.slug });
  },

  async bulkNotes(admin, { ids, action, reason }) {
    if (action === "disable" && (!reason || reason.length < 3)) throw badRequest("Give a reason (3+ characters)");
    let done = 0;
    for (const id of ids) {
      try {
        if (action === "delete") await this.deleteNote(admin, id);
        else await this.noteAction(admin, id, action === "disable" ? { action, reason } : { action });
        done++;
      } catch { /* skip notes that no longer exist */ }
    }
    await audit(admin, `note.bulk.${action}`, "note", null, { count: done, requested: ids.length });
    return { done };
  },

  // ---------------- reports ----------------
  async listReports(q) {
    const db = await getDb();
    const w = where();
    if (["open", "resolved", "dismissed"].includes(q.status)) w.add(`r.status = ?`, q.status);
    const { limit, offset, page: pg } = page(q, 20);
    const from = `FROM note_reports r JOIN notes n ON n.id = r.note_id LEFT JOIN users ru ON ru.id = r.reporter_id LEFT JOIN users ou ON ou.id = n.owner_id ${w.sql}`;
    const [{ count }] = await db.query(`SELECT COUNT(*) ${from}`, w.params);
    const rows = await db.query(
      `SELECT r.id, r.reason, r.details, r.status, r.created_at, r.resolved_at, r.resolution_note,
              n.id AS note_id, n.title, n.slug, n.disabled_at, ru.email AS reporter_email, ou.email AS owner_email
       ${from} ORDER BY (r.status = 'open') DESC, r.created_at DESC LIMIT ${limit} OFFSET ${offset}`, w.params);
    return {
      total: Number(count), page: pg, limit,
      items: rows.map((r) => ({
        id: r.id, reason: r.reason, details: r.details, status: r.status, createdAt: r.created_at, resolvedAt: r.resolved_at, resolutionNote: r.resolution_note,
        noteId: r.note_id, noteTitle: r.title, noteSlug: r.slug, noteDisabled: !!r.disabled_at, reporterEmail: r.reporter_email, ownerEmail: r.owner_email,
      })),
    };
  },

  async resolveReport(admin, id, { status, takedown, resolutionNote }) {
    const db = await getDb();
    const [r] = await db.query(`SELECT id, note_id, reason FROM note_reports WHERE id = $1`, [id]);
    if (!r) throw notFound("Report not found");
    if (takedown) {
      await db.query(`UPDATE notes SET disabled_at = COALESCE(disabled_at, now()), disabled_reason = COALESCE(disabled_reason, $2) WHERE id = $1`, [r.note_id, `Reported: ${r.reason}`.slice(0, 255)]);
      // A takedown settles every open report on that note.
      await db.query(`UPDATE note_reports SET status = $2, resolved_by_id = $3, resolved_at = now(), resolution_note = $4 WHERE note_id = $1 AND status = 'open'`, [r.note_id, status, admin.id, resolutionNote || null]);
    } else {
      await db.query(`UPDATE note_reports SET status = $2, resolved_by_id = $3, resolved_at = now(), resolution_note = $4 WHERE id = $1`, [id, status, admin.id, resolutionNote || null]);
    }
    await audit(admin, `report.${status}`, "report", id, { noteId: r.note_id, takedown: !!takedown });
  },

  // ---------------- audit log ----------------
  async listAudit(q) {
    const db = await getDb();
    const w = where();
    if (q.q) w.add(`(admin_email ILIKE ? OR action ILIKE ? OR target_id ILIKE ? OR meta::text ILIKE ?)`, `%${esc(q.q)}%`, `%${esc(q.q)}%`, `%${esc(q.q)}%`, `%${esc(q.q)}%`);
    if (q.targetType) w.add(`target_type = ?`, q.targetType);
    const { limit, offset, page: pg } = page(q, 50);
    const [{ count }] = await db.query(`SELECT COUNT(*) FROM audit_logs ${w.sql}`, w.params);
    const rows = await db.query(`SELECT * FROM audit_logs ${w.sql} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`, w.params);
    return {
      total: Number(count), page: pg, limit,
      items: rows.map((r) => ({ id: r.id, adminEmail: r.admin_email, action: r.action, targetType: r.target_type, targetId: r.target_id, meta: r.meta, createdAt: r.created_at })),
    };
  },

  // ---------------- attachments / storage ----------------
  async listAttachments(q) {
    const db = await getDb();
    const { limit, offset, page: pg } = page(q, 25);
    const [{ count }] = await db.query(`SELECT COUNT(*) FROM note_attachments`);
    const rows = await db.query(
      `SELECT a.id, a.filename, a.mime_type, a.size, a.created_at, n.id AS note_id, n.slug, n.title
       FROM note_attachments a JOIN notes n ON n.id = a.note_id ORDER BY a.size DESC LIMIT ${limit} OFFSET ${offset}`);
    return {
      total: Number(count), page: pg, limit,
      items: rows.map((r) => ({ id: r.id, filename: r.filename, mimeType: r.mime_type, size: r.size, createdAt: r.created_at, noteId: r.note_id, noteSlug: r.slug, noteTitle: r.title })),
    };
  },
  async deleteAttachment(admin, id) {
    const db = await getDb();
    const [a] = await db.query(`SELECT id, filename, storage_key, note_id FROM note_attachments WHERE id = $1`, [id]);
    if (!a) throw notFound("Attachment not found");
    await db.query(`DELETE FROM note_attachments WHERE id = $1`, [id]);
    await removeObject(a.storage_key);
    await audit(admin, "attachment.delete", "attachment", id, { filename: a.filename, noteId: a.note_id });
  },

  // ---------------- settings & maintenance ----------------
  getSettings,
  async updateSettings(admin, next) {
    const before = await getSettings();
    const saved = await saveSettings(next);
    const changed = Object.keys(next).filter((k) => JSON.stringify(before[k]) !== JSON.stringify(next[k]));
    await audit(admin, "settings.update", "settings", "site", { changed });
    return saved;
  },
  async runCleanup(admin) {
    const r = await runCleanup();
    await audit(admin, "maintenance.cleanup", "system", null, r);
    return r;
  },
};

// Report creation (public) lives here too to keep moderation code together.
export const reportService = {
  async create(idOrSlug, { reason, details }, ctx) {
    const { note } = await loadReadable(idOrSlug, ctx);
    const db = await getDb();
    if (ctx.userId) {
      const dup = await db.query(`SELECT 1 FROM note_reports WHERE note_id = $1 AND reporter_id = $2 AND status = 'open'`, [note.id, ctx.userId]);
      if (dup.length) return { ok: true };
    }
    await db.query(`INSERT INTO note_reports (note_id, reporter_id, reason, details) VALUES ($1,$2,$3,$4)`, [note.id, ctx.userId || null, reason, details || null]);
    return { ok: true };
  },
};
