import { EntitySchema } from "typeorm";

export const NoteInvitation = new EntitySchema({
  name: "NoteInvitation",
  tableName: "note_invitations",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    noteId: { type: "uuid" },
    email: { type: "varchar", length: 255 },
    permission: { type: "varchar", length: 8 }, // VIEW | EDIT
    token: { type: "varchar", length: 128, unique: true }, // store a hash, send the raw token
    expiresAt: { type: "timestamptz" },
    acceptedAt: { type: "timestamptz", nullable: true },
  },
  relations: {
    note: { type: "many-to-one", target: "Note", onDelete: "CASCADE", joinColumn: { name: "note_id" } },
  },
  indices: [{ name: "idx_note_invitations_email", columns: ["email"] }],
});
