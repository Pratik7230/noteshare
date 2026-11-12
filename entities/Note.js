import { EntitySchema } from "typeorm";

export const Note = new EntitySchema({
  name: "Note",
  tableName: "notes",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    title: { type: "varchar", length: 255, default: "" },
    slug: { type: "varchar", length: 64, unique: true },
    content: { type: "text", default: "" },
    contentType: { type: "varchar", length: 16, default: "rich" }, // rich | markdown | plain
    privacy: { type: "varchar", length: 16, default: "unlisted" }, // public | unlisted | private
    sharePermission: { type: "varchar", length: 8, default: "edit" }, // view | edit (link access)
    passwordHash: { type: "varchar", length: 255, nullable: true, select: false },
    // Anonymous notes: hash of a secret edit key kept in the creator's browser.
    editKeyHash: { type: "varchar", length: 128, nullable: true, select: false },
    ownerId: { type: "uuid", nullable: true },
    expiresAt: { type: "timestamptz", nullable: true },
    accessExpiresAt: { type: "timestamptz", nullable: true },
    maxViews: { type: "int", nullable: true },
    viewCount: { type: "int", default: 0 },
    disabledAt: { type: "timestamptz", nullable: true },
    disabledReason: { type: "varchar", length: 255, nullable: true },
    isArchived: { type: "boolean", default: false },
    isDeleted: { type: "boolean", default: false },
    deletedAt: { type: "timestamptz", nullable: true },
    createdAt: { type: "timestamptz", createDate: true },
    updatedAt: { type: "timestamptz", updateDate: true },
  },
  relations: {
    owner: {
      type: "many-to-one",
      target: "User",
      inverseSide: "notes",
      nullable: true,
      onDelete: "SET NULL",
      joinColumn: { name: "owner_id" },
    },
    versions: { type: "one-to-many", target: "NoteVersion", inverseSide: "note" },
    permissions: { type: "one-to-many", target: "NotePermission", inverseSide: "note" },
    attachments: { type: "one-to-many", target: "NoteAttachment", inverseSide: "note" },
    noteTags: { type: "one-to-many", target: "NoteTag", inverseSide: "note" },
  },
  indices: [
    { name: "idx_notes_owner_updated", columns: ["ownerId", "updatedAt"] },
    { name: "idx_notes_expires_at", columns: ["expiresAt"] },
  ],
});
