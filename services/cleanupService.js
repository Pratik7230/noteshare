import { getDb } from "../lib/db.js";
import { Note } from "../entities/index.js";
import { noteService } from "./noteService.js";

/** Removes expired notes, and trash older than 30 days. */
export async function runCleanup() {
  const db = await getDb();
  const repo = db.getRepository(Note);
  const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const expired = await repo.createQueryBuilder("n").select("n.id").where("n.expiresAt IS NOT NULL AND n.expiresAt < now()").getMany();
  const trashed = await repo.createQueryBuilder("n").select("n.id").where("n.isDeleted = true AND n.deletedAt < :cutoff", { cutoff }).getMany();
  for (const n of [...expired, ...trashed]) await noteService.hardDelete(n.id);
  await db.query(`DELETE FROM note_views WHERE viewed_at < now() - interval '180 days'`);
  return { expired: expired.length, trashed: trashed.length };
}
