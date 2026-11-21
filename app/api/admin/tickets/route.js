import { withApi } from "@/middleware/withApi";
import { adminTicketService } from "@/services/ticketService";

export const GET = withApi(async (req) =>
  Response.json(await adminTicketService.list(Object.fromEntries(new URL(req.url).searchParams))),
  { auth: "admin", limit: ["admin", 600, 60 * 1000] });
