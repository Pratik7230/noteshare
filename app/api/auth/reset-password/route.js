import { withApi } from "@/middleware/withApi";
import { resetSchema } from "@/validators/auth";
import { authService } from "@/services/authService";

export const POST = withApi(async (req) => {
  const { token, password } = resetSchema.parse(await req.json());
  await authService.resetPassword(token, password);
  return Response.json({ ok: true });
}, { limit: ["reset", 10, 60 * 60 * 1000] });
