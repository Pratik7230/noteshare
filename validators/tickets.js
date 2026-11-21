import { z } from "zod";
import { TICKET_CATEGORIES, TICKET_STATUSES, TICKET_PRIORITIES, TICKET_SUBJECT_MAX, TICKET_MESSAGE_MAX } from "../lib/tickets.js";

const message = z.string().trim().min(1, "Write a message").max(TICKET_MESSAGE_MAX, `Keep messages under ${TICKET_MESSAGE_MAX} characters`);

export const ticketCreateSchema = z.object({
  // Collapse whitespace: the subject ends up in an email subject line.
  subject: z.string().transform((s) => s.replace(/\s+/g, " ").trim())
    .pipe(z.string().min(5, "Subject needs at least 5 characters").max(TICKET_SUBJECT_MAX, `Keep the subject under ${TICKET_SUBJECT_MAX} characters`)),
  category: z.enum(Object.keys(TICKET_CATEGORIES)),
  message: message.min(10, "Describe the problem in at least 10 characters"),
});

export const ticketReplySchema = z.object({ message });

export const ticketUserActionSchema = z.object({ action: z.literal("close") });

export const adminTicketReplySchema = z.object({ message, close: z.boolean().optional() });

export const adminTicketUpdateSchema = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
}).refine((v) => v.status || v.priority, "Nothing to update");
