import { EntitySchema } from "typeorm";

export const SupportTicket = new EntitySchema({
  name: "SupportTicket",
  tableName: "support_tickets",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    // Human-friendly reference (#1042), filled by a serial column in the database.
    number: { type: "int", unique: true, insert: false, update: false },
    userId: { type: "uuid" },
    subject: { type: "varchar", length: 150 },
    category: { type: "varchar", length: 16 },
    status: { type: "varchar", length: 16, default: "open" },
    priority: { type: "varchar", length: 16, default: "normal" },
    lastMessageAt: { type: "timestamptz", default: () => "now()" },
    closedAt: { type: "timestamptz", nullable: true },
    createdAt: { type: "timestamptz", createDate: true },
    updatedAt: { type: "timestamptz", updateDate: true },
  },
  relations: {
    user: { type: "many-to-one", target: "User", onDelete: "CASCADE", joinColumn: { name: "user_id" } },
  },
});
