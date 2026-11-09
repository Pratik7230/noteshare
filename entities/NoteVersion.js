import { EntitySchema } from "typeorm";

export const NoteVersion = new EntitySchema({
  name: "NoteVersion",
  tableName: "note_versions",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    noteId: { type: "uuid" },
    title: { type: "varchar", length: 255, default: "" },
    content: { type: "text", default: "" },
    versionNumber: { type: "int" },
    createdAt: { type: "timestamptz", createDate: true },
  },
  relations: {
    note: { type: "many-to-one", target: "Note", inverseSide: "versions", onDelete: "CASCADE", joinColumn: { name: "note_id" } },
  },
  uniques: [{ name: "uq_note_versions_note_number", columns: ["noteId", "versionNumber"] }],
});
