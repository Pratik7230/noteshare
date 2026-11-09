import bcrypt from "bcryptjs";
import { timingSafeEqual } from "node:crypto";
import { getDb } from "../lib/db.js";
import { Note, NotePermission, NoteView, NoteStar, Tag, NoteTag, NoteVersion, NoteSlugRedirect, NoteAttachment } from "../entities/index.js";
import { noteRepository } from "../repositories/noteRepository.js";
import { ApiError, badRequest, conflict, forbidden, gone, notFound, unauthorized } from "../lib/errors.js";
import { randomSlug, validateCustomSlug } from "../lib/slug.js";
import { randomToken, sha256, visitorHash } from "../lib/crypto.js";
import { sanitizeNoteHtml, stripHtml } from "../lib/sanitize.js";
import { isUnlocked } from "../lib/auth.js";
import { TEMPLATES } from "../lib/templates.js";
import { removeObject } from "../lib/storage.js";
import { noteDto } from "./noteDto.js";

const VERSION_GAP_MS = 5 * 60 * 1000;
const MAX_VERSIONS = 100;

const safeEq = (a, b) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

const cleanContent = (content, type) => (type === "rich" ? sanitizeNoteHtml(content) : content);

/** Works out what this requester may do with a note. */
export async function buildAccess(note, { userId, editKey }) {
  const isOwner = !!(note.ownerId && note.ownerId === userId);
  const isKeyHolder = !!(!note.ownerId && editKey && note.editKeyHash && safeEq(sha256(editKey), note.editKeyHash));
  const isManager = isOwner || isKeyHolder;
  let perm = null;
  if (userId && !isOwner) {
    perm = await (await getDb()).getRepository(NotePermission).findOne({ where: { noteId: note.id, userId } });
  }
  const unlocked = !note.passwordHash || isManager || !!perm || (await isUnlocked(note.id));
  const canView = isManager || !!perm || note.privacy !== "private";
  const canEdit = unlocked && (isManager || perm?.permission === "EDIT" || (note.sharePermission === "edit" && note.privacy !== "private"));
  return { isOwner, isKeyHolder, isManager, perm, unlocked, canView, canEdit };
}

/** Loads a note and enforces visibility, expiry and limits. Does not count views. */
export async function loadReadable(idOrSlug, ctx) {
  const note = await noteRepository.findByIdOrSlug(idOrSlug);
  if (!note) {
    const to = /^[0-9a-f-]{36}$/i.test(idOrSlug) ? null : await noteRepository.findRedirect(idOrSlug);
    if (to) throw new ApiError(301, "Moved", { redirectTo: to });
    throw notFound("Note not found");
  }
  const access = await buildAccess(note, ctx);
  if (!access.canView) throw notFound("Note not found");
  if (note.isDeleted && !access.isManager) throw notFound("Note not found");
  if (note.expiresAt && note.expiresAt < new Date()) throw gone("This note has expired");
  if (!access.isManager && !access.perm) {
    if (note.accessExpiresAt && note.accessExpiresAt < new Date()) throw gone("Access to this note has expired");
    if (note.maxViews && note.viewCount >= note.maxViews) throw gone("This note has reached its view limit");
  }
  return { note, access };
}

/** Loads a note and requires edit rights / manager rights. */
export async function loadForEdit(idOrSlug, ctx) {
  const { note, access } = await loadReadable(idOrSlug, ctx);
  if (!access.canEdit) throw forbidden("This note is read-only for you");
  return { note, access };
}
export async function loadForManage(idOrSlug, ctx) {
  const { note, access } = await loadReadable(idOrSlug, ctx);
  if (!access.isManager) throw forbidden("Only the note owner can do this");
  return { note, access };
}

async function tagsFor(noteIds) {
  if (!noteIds.length) return {};
  const db = await getDb();
  const rows = await db.getRepository(NoteTag).createQueryBuilder("nt")
    .innerJoin("tags", "t", "t.id = nt.tag_id").select(["nt.note_id AS note_id", "t.name AS name"])
    .where("nt.note_id IN (:...ids)", { ids: noteIds }).getRawMany();
  const map = {};
  for (const r of rows) (map[r.note_id] ||= []).push(r.name);
  return map;
}

export const noteService = {
  async create(input, { userId }) {
    const tpl = input.template ? TEMPLATES[input.template] : null;
    const contentType = input.contentType || "rich";
    let slug;
    if (input.slug) {
      const v = validateCustomSlug(input.slug);
      if (!v.ok) throw badRequest(v.reason);
      if (!(await noteRepository.slugAvailable(v.slug))) throw conflict("That address is taken");
      slug = v.slug;
    } else {
      for (let i = 0; i < 6 && !slug; i++) {
        const s = randomSlug(i < 3 ? 9 : 12);
        if (await noteRepository.slugAvailable(s)) slug = s;
      }
      if (!slug) throw new ApiError(503, "Could not allocate an address, try again");
    }
    if (input.expiresAt && new Date(input.expiresAt) <= new Date()) throw badRequest("Expiry must be in the future");

    const editKey = userId ? null : randomToken();
    const note = await noteRepository.create({
      slug,
      title: input.title ?? tpl?.title ?? "",
      content: cleanContent(input.content ?? tpl?.content ?? "", contentType),
      contentType,
      ownerId: userId || null,
      editKeyHash: editKey ? sha256(editKey) : null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      privacy: "unlisted",
      sharePermission: "view",
    });
    return { note, editKey };
  },

  /** Read for the GET endpoint: handles lock screen, view counting and DTO. */
  async read(idOrSlug, ctx) {
    const { note, access } = await loadReadable(idOrSlug, ctx);
    const base = { slug: note.slug, title: null, locked: false };
    if (!access.unlocked) {
      return { locked: true, slug: note.slug, access: { isManager: false, canEdit: false } };
    }
    if (!access.isManager) {
      const db = await getDb();
      await noteRepository.incrementViews(note.id);
      await db.getRepository(NoteView).insert({ noteId: note.id, visitorHash: visitorHash(ctx.ip, ctx.ua) });
    }
    const db = await getDb();
    const tags = (await tagsFor([note.id]))[note.id] || [];
    const starred = ctx.userId
      ? !!(await db.getRepository(NoteStar).findOne({ where: { noteId: note.id, userId: ctx.userId } }))
      : false;
    return noteDto(note, access, { tags, starred });
  },

  async update(idOrSlug, input, ctx) {
    const { note, access } = await loadForEdit(idOrSlug, ctx);
    const db = await getDb();
    const patch = {};
    const type = input.contentType ?? note.contentType;

    if (input.slug !== undefined && input.slug !== note.slug) {
      if (!access.isManager) throw forbidden("Only the owner can change the address");
      const v = validateCustomSlug(input.slug);
      if (!v.ok) throw badRequest(v.reason);
      if (!(await noteRepository.slugAvailable(v.slug, note.id))) throw conflict("That address is taken");
      await db.transaction(async (m) => {
        await m.getRepository(NoteSlugRedirect).delete({ oldSlug: v.slug }); // reclaiming own old slug
        await m.getRepository(NoteSlugRedirect).insert({ noteId: note.id, oldSlug: note.slug });
      });
      patch.slug = v.slug;
    }
    if (input.title !== undefined) patch.title = input.title;
    if (input.contentType !== undefined) patch.contentType = input.contentType;
    if (input.content !== undefined) patch.content = cleanContent(input.content, type);
    else if (input.contentType !== undefined && input.contentType !== note.contentType) patch.content = cleanContent(note.content, type);
    if (input.expiresAt !== undefined) {
      if (!access.isManager) throw forbidden("Only the owner can change expiry");
      if (input.expiresAt && new Date(input.expiresAt) <= new Date()) throw badRequest("Expiry must be in the future");
      patch.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    }

    const changed = (patch.content !== undefined && patch.content !== note.content) || (patch.title !== undefined && patch.title !== note.title);
    if (changed) await versionService.snapshotIfDue(note);
    if (Object.keys(patch).length) await noteRepository.update(note.id, patch);
    const fresh = await noteRepository.findByIdOrSlug(note.id);
    return { slug: fresh.slug, updatedAt: fresh.updatedAt };
  },

  async remove(idOrSlug, { permanent }, ctx) {
    const { note, access } = await loadForManage(idOrSlug, ctx);
    if (permanent || !note.ownerId) {
      await this.hardDelete(note.id);
      return { deleted: "permanent" };
    }
    if (!access.isOwner) throw forbidden();
    await noteRepository.update(note.id, { isDeleted: true, deletedAt: new Date() });
    return { deleted: "trash" };
  },

  async hardDelete(noteId) {
    const db = await getDb();
    const atts = await db.getRepository(NoteAttachment).find({ where: { noteId } });
    await noteRepository.remove(noteId);
    for (const a of atts) await removeObject(a.storageKey);
  },

  async restore(idOrSlug, ctx) {
    const { note, access } = await loadForManage(idOrSlug, ctx);
    if (!access.isOwner) throw forbidden();
    await noteRepository.update(note.id, { isDeleted: false, deletedAt: null });
  },

  async archive(idOrSlug, archived, ctx) {
    const { note, access } = await loadForManage(idOrSlug, ctx);
    if (!access.isOwner) throw forbidden();
    const value = archived ?? !note.isArchived;
    await noteRepository.update(note.id, { isArchived: value });
    return { isArchived: value };
  },

  async toggleStar(idOrSlug, ctx) {
    if (!ctx.userId) throw unauthorized();
    const { note } = await loadReadable(idOrSlug, ctx);
    const repo = (await getDb()).getRepository(NoteStar);
    const existing = await repo.findOne({ where: { noteId: note.id, userId: ctx.userId } });
    if (existing) { await repo.delete({ id: existing.id }); return { starred: false }; }
    await repo.insert({ noteId: note.id, userId: ctx.userId });
    return { starred: true };
  },

  async duplicate(idOrSlug, ctx) {
    const { note, access } = await loadReadable(idOrSlug, ctx);
    if (!access.unlocked) throw forbidden();
    const { note: copy, editKey } = await this.create(
      { title: note.title ? `Copy of ${note.title}` : "", content: note.content, contentType: note.contentType },
      ctx
    );
    return { slug: copy.slug, editKey };
  },

  async updatePrivacy(idOrSlug, input, ctx) {
    const { note, access } = await loadForManage(idOrSlug, ctx);
    const patch = {};
    if (input.privacy) {
      if (input.privacy === "private" && !note.ownerId) throw badRequest("Sign in to make a note private");
      patch.privacy = input.privacy;
    }
    if (input.sharePermission) patch.sharePermission = input.sharePermission;
    if (input.password !== undefined) patch.passwordHash = input.password ? await bcrypt.hash(input.password, 12) : null;
    if (input.accessExpiresAt !== undefined) {
      if (input.accessExpiresAt && new Date(input.accessExpiresAt) <= new Date()) throw badRequest("Access expiry must be in the future");
      patch.accessExpiresAt = input.accessExpiresAt ? new Date(input.accessExpiresAt) : null;
    }
    if (input.maxViews !== undefined) patch.maxViews = input.maxViews;
    if (Object.keys(patch).length) await noteRepository.update(note.id, patch);
    const fresh = await noteRepository.findByIdOrSlug(note.id);
    return noteDto({ ...fresh, content: "" }, access);
  },

  async verifyPassword(idOrSlug, password, ctx) {
    const note = await noteRepository.findByIdOrSlug(idOrSlug);
    if (!note || !note.passwordHash || note.isDeleted) throw notFound("Note not found");
    const ok = await bcrypt.compare(password, note.passwordHash);
    if (!ok) throw new ApiError(401, "Incorrect password");
    return note;
  },

  async setTags(idOrSlug, names, ctx) {
    const { note, access } = await loadForManage(idOrSlug, ctx);
    if (!access.isOwner) throw forbidden("Sign in to use tags");
    const db = await getDb();
    const clean = [...new Set(names.map((n) => n.toLowerCase()))];
    await db.transaction(async (m) => {
      await m.getRepository(NoteTag).delete({ noteId: note.id });
      for (const name of clean) {
        await m.query(`INSERT INTO tags (name, user_id) VALUES ($1,$2) ON CONFLICT (user_id, name) DO NOTHING`, [name, ctx.userId]);
        const tag = await m.getRepository(Tag).findOne({ where: { name, userId: ctx.userId } });
        await m.getRepository(NoteTag).insert({ noteId: note.id, tagId: tag.id });
      }
    });
    return { tags: clean };
  },

  async userTags(userId) {
    const rows = await (await getDb()).getRepository(Tag).find({ where: { userId }, order: { name: "ASC" } });
    return rows.map((t) => t.name);
  },

  async checkSlug(slug, exceptNoteId) {
    const v = validateCustomSlug(slug);
    if (!v.ok) return { available: false, reason: v.reason };
    const ok = await noteRepository.slugAvailable(v.slug, exceptNoteId || null);
    return ok ? { available: true } : { available: false, reason: "That address is taken" };
  },

  /** Attach anonymous notes (proved by edit key) to the signed-in account. */
  async claim(items, userId) {
    const db = await getDb();
    const claimed = [];
    for (const { slug, editKey } of items) {
      const note = await noteRepository.findByIdOrSlug(slug);
      if (!note || note.ownerId || !note.editKeyHash || !safeEq(sha256(editKey), note.editKeyHash)) continue;
      await db.getRepository(Note).update({ id: note.id }, { ownerId: userId, editKeyHash: null });
      claimed.push(note.slug);
    }
    return claimed;
  },

  async list(userId, q) {
    const db = await getDb();
    const view = q.view || "mine";
    const qb = db.getRepository(Note).createQueryBuilder("note");
    const sortCol = { updatedAt: "note.updatedAt", createdAt: "note.createdAt", title: "note.title" }[q.sort] || "note.updatedAt";
    const order = q.order === "asc" ? "ASC" : "DESC";

    if (view === "starred") {
      qb.innerJoin(NoteStar, "s", "s.noteId = note.id AND s.userId = :userId", { userId })
        .where("note.isDeleted = false").andWhere("note.ownerId = :userId OR EXISTS (SELECT 1 FROM note_permissions p WHERE p.note_id = note.id AND p.user_id = :userId) OR note.privacy <> 'private'", { userId });
    } else if (view === "shared") {
      qb.innerJoin(NotePermission, "p", "p.noteId = note.id AND p.userId = :userId", { userId }).where("note.isDeleted = false");
    } else if (view === "archived") {
      qb.where("note.ownerId = :userId", { userId }).andWhere("note.isArchived = true AND note.isDeleted = false");
    } else if (view === "trash") {
      qb.where("note.ownerId = :userId AND note.isDeleted = true", { userId });
    } else {
      qb.where("note.ownerId = :userId", { userId }).andWhere("note.isArchived = false AND note.isDeleted = false");
    }

    if (q.privacy && ["public", "unlisted", "private"].includes(q.privacy)) qb.andWhere("note.privacy = :privacy", { privacy: q.privacy });
    if (q.from) qb.andWhere("note.createdAt >= :from", { from: new Date(q.from) });
    if (q.to) qb.andWhere("note.createdAt <= :to", { to: new Date(q.to) });
    if (q.tag) {
      qb.andWhere(`EXISTS (SELECT 1 FROM note_tags nt JOIN tags t ON t.id = nt.tag_id WHERE nt.note_id = note.id AND t.name = :tag)`, { tag: q.tag.toLowerCase() });
    }
    if (q.q) {
      const like = `%${q.q.replace(/[\\%_]/g, (c) => "\\" + c)}%`;
      qb.andWhere(`(note.title ILIKE :like OR to_tsvector('simple', note.content) @@ plainto_tsquery('simple', :q))`, { like, q: q.q });
    }

    const limit = Math.min(Math.max(parseInt(q.limit) || 20, 1), 50);
    const page = Math.max(parseInt(q.page) || 1, 1);
    const total = await qb.getCount();
    const rows = await qb
      .select(["note.id", "note.title", "note.slug", "note.privacy", "note.contentType", "note.updatedAt", "note.createdAt", "note.expiresAt", "note.isArchived", "note.isDeleted", "note.ownerId"])
      .addSelect("LEFT(note.content, 600)", "excerpt")
      .orderBy(sortCol, order).offset((page - 1) * limit).limit(limit)
      .getRawAndEntities();

    const ids = rows.entities.map((n) => n.id);
    const tagMap = await tagsFor(ids);
    const starredRows = ids.length ? await db.getRepository(NoteStar).createQueryBuilder("s").where("s.userId = :userId AND s.noteId IN (:...ids)", { userId, ids }).getMany() : [];
    const starred = new Set(starredRows.map((s) => s.noteId));
    const items = rows.entities.map((n, i) => {
      const excerpt = n.contentType === "rich" ? stripHtml(rows.raw[i].excerpt) : rows.raw[i].excerpt;
      return {
        id: n.id, title: n.title, slug: n.slug, privacy: n.privacy, contentType: n.contentType,
        updatedAt: n.updatedAt, createdAt: n.createdAt, expiresAt: n.expiresAt,
        isArchived: n.isArchived, isDeleted: n.isDeleted, isOwner: n.ownerId === userId,
        excerpt: (excerpt || "").replace(/\s+/g, " ").trim().slice(0, 180),
        tags: tagMap[n.id] || [], starred: starred.has(n.id),
      };
    });
    return { items, total, page, limit };
  },
};

// ---- versions live here to share snapshot logic with update() ----
export const versionService = {
  async snapshotIfDue(note, force = false) {
    const db = await getDb();
    const repo = db.getRepository(NoteVersion);
    const last = await repo.findOne({ where: { noteId: note.id }, order: { versionNumber: "DESC" } });
    if (!force && last && Date.now() - new Date(last.createdAt).getTime() < VERSION_GAP_MS) return null;
    if (!note.content && !note.title) return null;
    const saved = await repo.save(repo.create({ noteId: note.id, title: note.title, content: note.content, versionNumber: (last?.versionNumber || 0) + 1 }));
    const count = await repo.count({ where: { noteId: note.id } });
    if (count > MAX_VERSIONS) {
      await db.query(`DELETE FROM note_versions WHERE id IN (SELECT id FROM note_versions WHERE note_id=$1 ORDER BY version_number ASC LIMIT $2)`, [note.id, count - MAX_VERSIONS]);
    }
    return saved;
  },
  async list(idOrSlug, ctx) {
    const { note } = await loadForEdit(idOrSlug, ctx);
    const rows = await (await getDb()).getRepository(NoteVersion).find({ where: { noteId: note.id }, order: { versionNumber: "DESC" }, take: MAX_VERSIONS });
    return rows.map((v) => ({ id: v.id, versionNumber: v.versionNumber, title: v.title, content: v.content, createdAt: v.createdAt }));
  },
  async createManual(idOrSlug, ctx) {
    const { note } = await loadForEdit(idOrSlug, ctx);
    const v = await this.snapshotIfDue(note, true);
    return v ? { versionNumber: v.versionNumber, createdAt: v.createdAt } : { versionNumber: null };
  },
  async restore(idOrSlug, versionId, ctx) {
    const { note } = await loadForEdit(idOrSlug, ctx);
    const db = await getDb();
    const v = await db.getRepository(NoteVersion).findOne({ where: { id: versionId, noteId: note.id } });
    if (!v) throw notFound("Version not found");
    await this.snapshotIfDue(note, true); // keep what we're replacing
    await noteRepository.update(note.id, { title: v.title, content: cleanContent(v.content, note.contentType) });
    return { restored: v.versionNumber };
  },
};
