import { EntitySchema } from "typeorm";

export const NoteStar = new EntitySchema({
  name: "NoteStar",
  tableName: "note_stars",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    noteId: { type: "uuid" },
    userId: { type: "uuid" },
  },
  relations: {
    note: { type: "many-to-one", target: "Note", onDelete: "CASCADE", joinColumn: { name: "note_id" } },
    user: { type: "many-to-one", target: "User", onDelete: "CASCADE", joinColumn: { name: "user_id" } },
  },
  uniques: [{ name: "uq_note_stars_note_user", columns: ["noteId", "userId"] }],
});
