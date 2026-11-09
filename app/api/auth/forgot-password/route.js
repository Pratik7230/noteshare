import { withApi } from "@/middleware/withApi";
import { forgotSchema } from "@/validators/auth";
import { authService } from "@/services/authService";

export const POST = withApi(async (req) => {
  await authService.forgotPassword(forgotSchema.parse(await req.json()).email);
  return Response.json({ ok: true }); // same answer whether or not the email exists
}, { limit: ["forgot", 5, 60 * 60 * 1000] });
