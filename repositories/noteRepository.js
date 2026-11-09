import { getDb } from "../lib/db.js";
import { Note, NoteSlugRedirect } from "../entities/index.js";
import { UUID_RE } from "../lib/slug.js";

const repo = async () => (await getDb()).getRepository(Note);

const withSecrets = (qb) => qb.addSelect(["note.passwordHash", "note.editKeyHash"]);

export const noteRepository = {
  async findByIdOrSlug(idOrSlug) {
    const qb = withSecrets((await repo()).createQueryBuilder("note"));
    if (UUID_RE.test(idOrSlug)) qb.where("note.id = :v", { v: idOrSlug });
    else qb.where("note.slug = :v", { v: idOrSlug.toLowerCase() });
    return qb.getOne();
  },
  async findRedirect(oldSlug) {
    const db = await getDb();
    const r = await db.getRepository(NoteSlugRedirect).findOne({ where: { oldSlug: oldSlug.toLowerCase() }, relations: { note: true } });
    return r?.note?.slug || null;
  },
  /** A slug is free if no note uses it and no *other* note redirects from it. */
  async slugAvailable(slug, exceptNoteId = null) {
    const db = await getDb();
    const n = await db.getRepository(Note).findOne({ where: { slug }, select: { id: true } });
    if (n) return false;
    const r = await db.getRepository(NoteSlugRedirect).findOne({ where: { oldSlug: slug } });
    return !r || r.noteId === exceptNoteId;
  },
  async create(data) { const r = await repo(); return r.save(r.create(data)); },
  async save(note) { return (await repo()).save(note); },
  async update(id, patch) { return (await repo()).update({ id }, patch); },
  async remove(id) { return (await repo()).delete({ id }); },
  async incrementViews(id) { return (await repo()).increment({ id }, "viewCount", 1); },
};
