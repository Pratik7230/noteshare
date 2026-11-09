import { withApi } from "@/middleware/withApi";
import { tokenSchema } from "@/validators/auth";
import { authService } from "@/services/authService";

export const POST = withApi(async (req) => {
  await authService.verifyEmail(tokenSchema.parse(await req.json()).token);
  return Response.json({ ok: true });
}, { limit: ["verify", 20, 60 * 60 * 1000] });
