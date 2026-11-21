import { withApi } from "@/middleware/withApi";
import { adminTicketService } from "@/services/ticketService";
import { userRepository } from "@/repositories/userRepository";
import { adminTicketUpdateSchema } from "@/validators/tickets";

const opts = { auth: "admin", limit: ["admin", 600, 60 * 1000] };

export const GET = withApi(async (req, { params }) => Response.json(await adminTicketService.get(params.id)), opts);

export const PATCH = withApi(async (req, { params, userId }) =>
  Response.json(await adminTicketService.update(await userRepository.findById(userId), params.id, adminTicketUpdateSchema.parse(await req.json()))),
  opts);
