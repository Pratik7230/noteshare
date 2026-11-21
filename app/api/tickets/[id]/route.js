import { withApi } from "@/middleware/withApi";
import { ticketService } from "@/services/ticketService";
import { ticketUserActionSchema } from "@/validators/tickets";

export const GET = withApi(async (req, { userId, params }) =>
  Response.json(await ticketService.get(userId, params.id)),
  { auth: "required" });

// Only action today: { action: "close" }. Closing is final: closed tickets can't be reopened.
export const PATCH = withApi(async (req, { userId, params }) => {
  ticketUserActionSchema.parse(await req.json());
  return Response.json(await ticketService.close(userId, params.id));
}, { auth: "required", limit: ["ticket-update", 30, 60 * 60 * 1000] });
