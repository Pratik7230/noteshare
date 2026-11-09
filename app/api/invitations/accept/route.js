import { withApi } from "@/middleware/withApi";
import { tokenSchema } from "@/validators/auth";
import { shareService } from "@/services/shareService";

export const POST = withApi(async (req, { userId }) =>
  Response.json(await shareService.accept(tokenSchema.parse(await req.json()).token, userId)),
  { auth: "required", limit: ["accept", 20, 60 * 60 * 1000] });
