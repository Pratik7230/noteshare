import { getDb } from "../lib/db.js";
import { NoteInvitation, NotePermission, NoteView, User } from "../entities/index.js";
import { badRequest, forbidden, notFound } from "../lib/errors.js";
import { randomToken, sha256 } from "../lib/crypto.js";
import { sendMail } from "../lib/mailer.js";
import { loadForManage, loadReadable } from "./noteService.js";
import { userRepository } from "../repositories/userRepository.js";

const appUrl = () => process.env.APP_URL || "http://localhost:3000";

export const shareService = {
  async invite(idOrSlug, { email, permission }, ctx) {
    const { note, access } = await loadForManage(idOrSlug, ctx);
    if (!access.isOwner) throw forbidden("Sign in to invite collaborators");
    const inviter = await userRepository.findById(ctx.userId);
    if (inviter.email === email) throw badRequest("You already own this note");
    const db = await getDb();
    const repo = db.getRepository(NoteInvitation);
    await repo.delete({ noteId: note.id, email }); // replace any pending invite
    const token = randomToken();
    await repo.insert({
      noteId: note.id, email, permission, token: sha256(token),
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    });
    const url = `${appUrl()}/invite/${token}`;
    await sendMail({
      to: email, subject: `${inviter.name} invited you to a note`,
      text: `${inviter.name} shared "${note.title || "Untitled"}" with you (${permission.toLowerCase()} access).\nOpen: ${url}\n`,
    });
    return { ok: true, ...(process.env.NODE_ENV !== "production" ? { devInviteUrl: url } : {}) };
  },

  async collaborators(idOrSlug, ctx) {
    const { note } = await loadForManage(idOrSlug, ctx);
    const db = await getDb();
    const perms = await db.getRepository(NotePermission).createQueryBuilder("p")
      .innerJoin(User, "u", "u.id = p.userId").select(["p.id AS id", "p.permission AS permission", "u.name AS name", "u.email AS email", "u.id AS user_id", "u.avatarUpdatedAt AS avatar_v"])
      .where("p.noteId = :id", { id: note.id }).getRawMany();
    const pending = await db.getRepository(NoteInvitation).find({ where: { noteId: note.id } });
    return {
      collaborators: perms.map((p) => ({ userId: p.user_id, name: p.name, email: p.email, permission: p.permission, avatarUrl: p.avatar_v ? `/api/users/${p.user_id}/avatar?v=${new Date(p.avatar_v).getTime()}` : null })),
      pending: pending.filter((i) => !i.acceptedAt && i.expiresAt > new Date()).map((i) => ({ id: i.id, email: i.email, permission: i.permission })),
    };
  },

  async removeAccess(idOrSlug, { userId, invitationId }, ctx) {
    const { note } = await loadForManage(idOrSlug, ctx);
    const db = await getDb();
    if (userId) await db.getRepository(NotePermission).delete({ noteId: note.id, userId });
    if (invitationId) await db.getRepository(NoteInvitation).delete({ noteId: note.id, id: invitationId });
  },

  async accept(token, userId) {
    const db = await getDb();
    const inv = await db.getRepository(NoteInvitation).findOne({ where: { token: sha256(token) }, relations: { note: true } });
    if (!inv || inv.acceptedAt || inv.expiresAt < new Date()) throw badRequest("This invitation is invalid or has expired");
    const user = await userRepository.findById(userId);
    if (user.email !== inv.email) throw forbidden(`This invitation was sent to ${inv.email}. Sign in with that email.`);
    await db.query(
      `INSERT INTO note_permissions (note_id, user_id, permission) VALUES ($1,$2,$3)
       ON CONFLICT (note_id, user_id) DO UPDATE SET permission = EXCLUDED.permission`,
      [inv.noteId, userId, inv.permission]
    );
    await db.getRepository(NoteInvitation).update({ id: inv.id }, { acceptedAt: new Date() });
    return { slug: inv.note.slug };
  },

  async analytics(idOrSlug, ctx) {
    const { note } = await loadForManage(idOrSlug, ctx);
    const db = await getDb();
    const r = await db.getRepository(NoteView).createQueryBuilder("v")
      .select("COUNT(DISTINCT v.visitorHash)", "unique").addSelect("MAX(v.viewedAt)", "last")
      .where("v.noteId = :id", { id: note.id }).getRawOne();
    return {
      totalViews: note.viewCount, uniqueViews: Number(r.unique), lastAccessed: r.last,
      createdAt: note.createdAt, expiresAt: note.expiresAt,
    };
  },
};
