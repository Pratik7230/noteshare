import { withApi } from "@/middleware/withApi";
import { ticketService } from "@/services/ticketService";
import { ticketReplySchema } from "@/validators/tickets";

export const POST = withApi(async (req, { userId, params }) =>
  Response.json(await ticketService.reply(userId, params.id, ticketReplySchema.parse(await req.json())), { status: 201 }),
  { auth: "required", limit: ["ticket-reply", 30, 60 * 60 * 1000] });
