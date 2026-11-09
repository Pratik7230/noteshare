import { EntitySchema } from "typeorm";

export const NoteView = new EntitySchema({
  name: "NoteView",
  tableName: "note_views",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    noteId: { type: "uuid" },
    // sha256(salt + ip + user-agent + day): no raw IPs stored
    visitorHash: { type: "varchar", length: 64 },
    viewedAt: { type: "timestamptz", createDate: true },
  },
  relations: {
    note: { type: "many-to-one", target: "Note", onDelete: "CASCADE", joinColumn: { name: "note_id" } },
  },
  indices: [{ name: "idx_note_views_note_visitor", columns: ["noteId", "visitorHash"] }],
});
