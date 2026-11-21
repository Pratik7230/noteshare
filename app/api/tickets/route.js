import { withApi } from "@/middleware/withApi";
import { ticketService } from "@/services/ticketService";
import { ticketCreateSchema } from "@/validators/tickets";

export const GET = withApi(async (req, { userId }) =>
  Response.json(await ticketService.list(userId, Object.fromEntries(new URL(req.url).searchParams))),
  { auth: "required" });

export const POST = withApi(async (req, { userId }) =>
  Response.json(await ticketService.create(userId, ticketCreateSchema.parse(await req.json())), { status: 201 }),
  { auth: "required", limit: ["ticket", 5, 60 * 60 * 1000] });
