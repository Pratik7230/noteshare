import { EntitySchema } from "typeorm";

/** Old slug -> note, so renamed links keep working. */
export const NoteSlugRedirect = new EntitySchema({
  name: "NoteSlugRedirect",
  tableName: "note_slug_redirects",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    noteId: { type: "uuid" },
    oldSlug: { type: "varchar", length: 64, unique: true },
    createdAt: { type: "timestamptz", createDate: true },
  },
  relations: {
    note: { type: "many-to-one", target: "Note", onDelete: "CASCADE", joinColumn: { name: "note_id" } },
  },
});
