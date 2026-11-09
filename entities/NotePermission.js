import { EntitySchema } from "typeorm";

export const NotePermission = new EntitySchema({
  name: "NotePermission",
  tableName: "note_permissions",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    noteId: { type: "uuid" },
    userId: { type: "uuid" },
    permission: { type: "varchar", length: 8 }, // VIEW | EDIT
    createdAt: { type: "timestamptz", createDate: true },
  },
  relations: {
    note: { type: "many-to-one", target: "Note", inverseSide: "permissions", onDelete: "CASCADE", joinColumn: { name: "note_id" } },
    user: { type: "many-to-one", target: "User", onDelete: "CASCADE", joinColumn: { name: "user_id" } },
  },
  uniques: [{ name: "uq_note_permissions_note_user", columns: ["noteId", "userId"] }],
  indices: [{ name: "idx_note_permissions_user", columns: ["userId"] }],
});
