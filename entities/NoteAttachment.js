import { EntitySchema } from "typeorm";

export const NoteAttachment = new EntitySchema({
  name: "NoteAttachment",
  tableName: "note_attachments",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    noteId: { type: "uuid" },
    filename: { type: "varchar", length: 255 },
    storageKey: { type: "varchar", length: 512 },
    mimeType: { type: "varchar", length: 127 },
    size: { type: "int" },
    createdAt: { type: "timestamptz", createDate: true },
  },
  relations: {
    note: { type: "many-to-one", target: "Note", inverseSide: "attachments", onDelete: "CASCADE", joinColumn: { name: "note_id" } },
  },
});
