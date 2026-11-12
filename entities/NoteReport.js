import { EntitySchema } from "typeorm";

export const NoteReport = new EntitySchema({
  name: "NoteReport",
  tableName: "note_reports",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    noteId: { type: "uuid" },
    reporterId: { type: "uuid", nullable: true },
    reason: { type: "varchar", length: 16 },
    details: { type: "varchar", length: 500, nullable: true },
    status: { type: "varchar", length: 16, default: "open" },
    resolvedById: { type: "uuid", nullable: true },
    resolvedAt: { type: "timestamptz", nullable: true },
    resolutionNote: { type: "varchar", length: 500, nullable: true },
    createdAt: { type: "timestamptz", createDate: true },
  },
  relations: {
    note: { type: "many-to-one", target: "Note", onDelete: "CASCADE", joinColumn: { name: "note_id" } },
  },
});
