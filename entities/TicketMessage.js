import { EntitySchema } from "typeorm";

export const TicketMessage = new EntitySchema({
  name: "TicketMessage",
  tableName: "ticket_messages",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    ticketId: { type: "uuid" },
    authorId: { type: "uuid", nullable: true },
    isStaff: { type: "boolean", default: false },
    body: { type: "varchar", length: 5000 },
    createdAt: { type: "timestamptz", createDate: true },
  },
  relations: {
    ticket: { type: "many-to-one", target: "SupportTicket", onDelete: "CASCADE", joinColumn: { name: "ticket_id" } },
  },
});
