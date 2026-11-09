import { EntitySchema } from "typeorm";

export const NoteTag = new EntitySchema({
  name: "NoteTag",
  tableName: "note_tags",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    noteId: { type: "uuid" },
    tagId: { type: "uuid" },
  },
  relations: {
    note: { type: "many-to-one", target: "Note", inverseSide: "noteTags", onDelete: "CASCADE", joinColumn: { name: "note_id" } },
    tag: { type: "many-to-one", target: "Tag", onDelete: "CASCADE", joinColumn: { name: "tag_id" } },
  },
  uniques: [{ name: "uq_note_tags_note_tag", columns: ["noteId", "tagId"] }],
  indices: [{ name: "idx_note_tags_tag", columns: ["tagId"] }],
});
