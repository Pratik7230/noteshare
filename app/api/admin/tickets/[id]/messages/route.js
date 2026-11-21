import { withApi } from "@/middleware/withApi";
import { adminTicketService } from "@/services/ticketService";
import { userRepository } from "@/repositories/userRepository";
import { adminTicketReplySchema } from "@/validators/tickets";

export const POST = withApi(async (req, { params, userId }) =>
  Response.json(await adminTicketService.reply(await userRepository.findById(userId), params.id, adminTicketReplySchema.parse(await req.json())), { status: 201 }),
  { auth: "admin", limit: ["admin", 600, 60 * 1000] });
