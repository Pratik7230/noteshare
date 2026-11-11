import { getDb } from "../lib/db.js";
import { NoteAttachment } from "../entities/index.js";
import { badRequest, forbidden, notFound } from "../lib/errors.js";
import { putObject, getObject, removeObject, storagePaths, isRemoteUrl, getObjectStream } from "../lib/storage.js";
import { loadForEdit, loadReadable } from "./noteService.js";

export const MAX_SIZE = 5 * 1024 * 1024;
const MAX_PER_NOTE = 20;
const ALLOWED = {
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/gif": [[0x47, 0x49, 0x46, 0x38]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]],
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]],
  "text/plain": null, // no magic bytes; stored and served as an attachment
};
const matches = (buf, sigs) => !sigs || sigs.some((sig) => sig.every((b, i) => buf[i] === b));

export const attachmentService = {
  async add(idOrSlug, file, ctx) {
    const { note } = await loadForEdit(idOrSlug, ctx);
    if (!file || typeof file.arrayBuffer !== "function") throw badRequest("No file uploaded");
    if (file.size > MAX_SIZE) throw badRequest("File is too large (max 5 MB)");
    const mime = file.type;
    if (!(mime in ALLOWED)) throw badRequest("File type not allowed (images, PDF, plain text)");
    const buf = Buffer.from(await file.arrayBuffer());
    if (!matches(buf, ALLOWED[mime])) throw badRequest("File contents do not match its type");
    const db = await getDb();
    const repo = db.getRepository(NoteAttachment);
    if ((await repo.count({ where: { noteId: note.id } })) >= MAX_PER_NOTE) throw badRequest("Attachment limit reached");
    const filename = file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 200) || "file";
    const pathKey = storagePaths.attachment(note.id, filename);
    const { storageKey } = await putObject(pathKey, buf, { contentType: mime });
    const a = await repo.save(repo.create({ noteId: note.id, filename, storageKey, mimeType: mime, size: buf.length }));
    return { id: a.id, filename, mimeType: mime, size: a.size, url: `/api/attachments/${a.id}` };
  },
  async list(idOrSlug, ctx) {
    const { note } = await loadReadable(idOrSlug, ctx);
    const rows = await (await getDb()).getRepository(NoteAttachment).find({ where: { noteId: note.id }, order: { createdAt: "ASC" } });
    return rows.map((a) => ({ id: a.id, filename: a.filename, mimeType: a.mimeType, size: a.size, url: `/api/attachments/${a.id}` }));
  },
  async fetch(id, ctx) {
    const a = await (await getDb()).getRepository(NoteAttachment).findOne({ where: { id } });
    if (!a) throw notFound();
    const { access } = await loadReadable(a.noteId, ctx);
    if (!access.unlocked) throw forbidden();
    const { stream, buffer } = await getObjectStream(a.storageKey);
    return {
      a,
      stream,
      buffer,
      data: buffer,
    };
  },
  async remove(id, ctx) {
    const repo = (await getDb()).getRepository(NoteAttachment);
    const a = await repo.findOne({ where: { id } });
    if (!a) throw notFound();
    await loadForEdit(a.noteId, ctx);
    await repo.delete({ id });
    await removeObject(a.storageKey);
  },
};
