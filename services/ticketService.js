import { getDb } from "../lib/db.js";
import { ApiError, conflict, notFound } from "../lib/errors.js";
import { sendMail } from "../lib/mailer.js";
import { UUID_RE } from "../lib/slug.js";
import { TICKET_CATEGORIES, TICKET_STATUSES, TICKET_PRIORITIES, TICKET_MAX_OPEN } from "../lib/tickets.js";
import { audit } from "./auditService.js";
import { avatarUrlFor } from "./authService.js";

const appUrl = () => process.env.APP_URL || "http://localhost:3000";
// Closing is final, whoever does it: a closed ticket is read-only and never reopens.
const closedError = () => conflict("This ticket is closed and can't be reopened.");
const esc = (s) => s.replace(/[\\%_]/g, (c) => "\\" + c);
const pageOf = (q, size) => {
  const p = Math.max(parseInt(q.page) || 1, 1);
  return { limit: size, offset: (p - 1) * size, page: p };
};

const ticketRow = (r) => ({
  id: r.id, number: r.number, subject: r.subject, category: r.category, status: r.status,
  lastMessageAt: r.last_message_at, closedAt: r.closed_at, createdAt: r.created_at,
  messageCount: Number(r.message_count ?? 0),
});

async function messagesFor(db, ticketId, { staffView }) {
  const rows = await db.query(
    `SELECT m.id, m.body, m.is_staff, m.created_at, m.author_id, u.name AS author_name, u.email AS author_email
     FROM ticket_messages m LEFT JOIN users u ON u.id = m.author_id
     WHERE m.ticket_id = $1 ORDER BY m.created_at`, [ticketId]);
  return rows.map((m) => ({
    id: m.id, body: m.body, isStaff: m.is_staff, createdAt: m.created_at,
    // Users see "Support team", not which admin answered.
    author: staffView
      ? { id: m.author_id, name: m.author_name || "Deleted user", email: m.author_email }
      : { name: m.is_staff ? "Support team" : "You" },
  }));
}

async function loadOwn(db, userId, id) {
  if (!UUID_RE.test(id)) throw notFound("Ticket not found");
  const [t] = await db.query(`SELECT * FROM support_tickets WHERE id = $1 AND user_id = $2`, [id, userId]);
  if (!t) throw notFound("Ticket not found");
  return t;
}

/** Tickets as seen by the user who opened them. */
export const ticketService = {
  async list(userId, q) {
    const db = await getDb();
    const params = [userId];
    let filter = "";
    if (q.status === "active") filter = `AND t.status <> 'closed'`;
    else if (TICKET_STATUSES.includes(q.status)) { params.push(q.status); filter = `AND t.status = $2`; }
    const { limit, offset, page } = pageOf(q, 20);
    const [{ count }] = await db.query(`SELECT COUNT(*) FROM support_tickets t WHERE t.user_id = $1 ${filter}`, params);
    const rows = await db.query(
      `SELECT t.*, (SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id = t.id) AS message_count
       FROM support_tickets t WHERE t.user_id = $1 ${filter}
       ORDER BY (t.status = 'answered') DESC, t.last_message_at DESC LIMIT ${limit} OFFSET ${offset}`, params);
    return { items: rows.map(ticketRow), total: Number(count), page, limit };
  },

  async get(userId, id) {
    const db = await getDb();
    const t = await loadOwn(db, userId, id);
    return { ...ticketRow(t), messages: await messagesFor(db, t.id, { staffView: false }) };
  },

  async create(userId, { subject, category, message }) {
    const db = await getDb();
    const [{ count }] = await db.query(`SELECT COUNT(*) FROM support_tickets WHERE user_id = $1 AND status <> 'closed'`, [userId]);
    if (Number(count) >= TICKET_MAX_OPEN) {
      throw new ApiError(429, `You already have ${TICKET_MAX_OPEN} open tickets. Close one, or reply on an existing ticket instead.`);
    }
    const id = await db.transaction(async (m) => {
      const [t] = await m.query(`INSERT INTO support_tickets (user_id, subject, category) VALUES ($1, $2, $3) RETURNING id`, [userId, subject, category]);
      await m.query(`INSERT INTO ticket_messages (ticket_id, author_id, body) VALUES ($1, $2, $3)`, [t.id, userId, message]);
      return t.id;
    });
    return this.get(userId, id);
  },

  async reply(userId, id, { message }) {
    const db = await getDb();
    const t = await loadOwn(db, userId, id);
    if (t.status === "closed") throw closedError();
    await db.transaction(async (m) => {
      // A user reply puts the ticket back in the support queue. The status guard also
      // covers a close that lands between the check above and this update.
      const [, updated] = await m.query(
        `UPDATE support_tickets SET status = 'open', last_message_at = now(), updated_at = now() WHERE id = $1 AND status <> 'closed'`, [t.id]);
      if (!updated) throw closedError();
      await m.query(`INSERT INTO ticket_messages (ticket_id, author_id, body) VALUES ($1, $2, $3)`, [t.id, userId, message]);
    });
    return this.get(userId, t.id);
  },

  async close(userId, id) {
    const db = await getDb();
    const t = await loadOwn(db, userId, id);
    if (t.status !== "closed") {
      await db.query(`UPDATE support_tickets SET status = 'closed', closed_at = now(), updated_at = now() WHERE id = $1 AND status <> 'closed'`, [t.id]);
    }
    return this.get(userId, t.id);
  },
};

async function emailReply(t, message) {
  try {
    await sendMail({
      to: t.user.email,
      subject: `Re: [#${t.number}] ${t.subject}`,
      text: `Hi ${t.user.name},\n\nThe NoteShare support team replied to your ticket "${t.subject}":\n\n${message}\n\nView the conversation or reply: ${appUrl()}/support/${t.id}\n`,
    });
  } catch (e) { console.error("[tickets] reply email failed", e.message); }
}

/** Ticket queue for admins. */
export const adminTicketService = {
  async list(q) {
    const db = await getDb();
    const w = [], params = [];
    const p = (v) => { params.push(v); return `$${params.length}`; };
    if (TICKET_STATUSES.includes(q.status)) w.push(`t.status = ${p(q.status)}`);
    if (TICKET_PRIORITIES.includes(q.priority)) w.push(`t.priority = ${p(q.priority)}`);
    if (q.category && Object.hasOwn(TICKET_CATEGORIES, q.category)) w.push(`t.category = ${p(q.category)}`);
    const s = (q.q || "").trim().replace(/^#/, "");
    if (s) {
      const like = p(`%${esc(s)}%`);
      const any = [`t.subject ILIKE ${like}`, `u.email ILIKE ${like}`, `u.name ILIKE ${like}`];
      if (/^\d{1,9}$/.test(s)) any.push(`t.number = ${p(Number(s))}`);
      w.push(`(${any.join(" OR ")})`);
    }
    // The open queue shows urgent, then longest-waiting tickets first.
    const order = q.status === "open"
      ? `CASE t.priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END, t.last_message_at ASC`
      : `(t.status = 'open') DESC, t.last_message_at DESC`;
    const { limit, offset, page } = pageOf(q, 25);
    const from = `FROM support_tickets t JOIN users u ON u.id = t.user_id`;
    const where = w.length ? `WHERE ${w.join(" AND ")}` : "";
    const [{ count }] = await db.query(`SELECT COUNT(*) ${from} ${where}`, params);
    const rows = await db.query(
      `SELECT t.*, u.name AS user_name, u.email AS user_email, lm.preview,
              (SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id = t.id) AS message_count
       ${from}
       LEFT JOIN LATERAL (SELECT left(m.body, 160) AS preview FROM ticket_messages m WHERE m.ticket_id = t.id ORDER BY m.created_at DESC LIMIT 1) lm ON true
       ${where} ORDER BY ${order} LIMIT ${limit} OFFSET ${offset}`, params);
    const counts = Object.fromEntries(TICKET_STATUSES.map((st) => [st, 0]));
    for (const r of await db.query(`SELECT status, COUNT(*) AS n FROM support_tickets GROUP BY status`)) counts[r.status] = Number(r.n);
    return {
      total: Number(count), page, limit, counts,
      items: rows.map((r) => ({ ...ticketRow(r), priority: r.priority, preview: r.preview, user: { id: r.user_id, name: r.user_name, email: r.user_email } })),
    };
  },

  async get(id) {
    if (!UUID_RE.test(id)) throw notFound("Ticket not found");
    const db = await getDb();
    const [t] = await db.query(
      `SELECT t.*, u.name AS user_name, u.email AS user_email, u.avatar_updated_at, u.created_at AS user_created_at, u.suspended_at
       FROM support_tickets t JOIN users u ON u.id = t.user_id WHERE t.id = $1`, [id]);
    if (!t) throw notFound("Ticket not found");
    return {
      ...ticketRow(t), priority: t.priority,
      user: {
        id: t.user_id, name: t.user_name, email: t.user_email, joinedAt: t.user_created_at, suspended: !!t.suspended_at,
        avatarUrl: avatarUrlFor({ id: t.user_id, avatarUpdatedAt: t.avatar_updated_at }),
      },
      messages: await messagesFor(db, t.id, { staffView: true }),
    };
  },

  async reply(admin, id, { message, close }) {
    const t = await this.get(id);
    if (t.status === "closed") throw closedError();
    const db = await getDb();
    await db.transaction(async (m) => {
      const [, updated] = await m.query(
        `UPDATE support_tickets SET status = $2${close ? ", closed_at = now()" : ""}, last_message_at = now(), updated_at = now() WHERE id = $1 AND status <> 'closed'`,
        [t.id, close ? "closed" : "answered"]);
      if (!updated) throw closedError();
      await m.query(`INSERT INTO ticket_messages (ticket_id, author_id, is_staff, body) VALUES ($1, $2, true, $3)`, [t.id, admin.id, message]);
    });
    await audit(admin, close ? "ticket.replyAndClose" : "ticket.reply", "ticket", t.id, { number: t.number });
    await emailReply(t, message);
    return this.get(t.id);
  },

  async update(admin, id, { status, priority }) {
    const t = await this.get(id);
    if (t.status === "closed") throw closedError();
    const sets = [], params = [t.id], changed = {};
    if (status && status !== t.status) {
      params.push(status);
      sets.push(`status = $${params.length}`);
      if (status === "closed") sets.push(`closed_at = now()`);
      changed.status = status;
    }
    if (priority && priority !== t.priority) {
      params.push(priority);
      sets.push(`priority = $${params.length}`);
      changed.priority = priority;
    }
    if (!sets.length) return t;
    const [, updated] = await (await getDb()).query(`UPDATE support_tickets SET ${sets.join(", ")}, updated_at = now() WHERE id = $1 AND status <> 'closed'`, params);
    if (!updated) throw closedError();
    await audit(admin, "ticket.update", "ticket", t.id, { number: t.number, ...changed });
    return this.get(t.id);
  },
};
