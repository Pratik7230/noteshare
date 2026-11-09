import { withApi } from "@/middleware/withApi";
import { authService } from "@/services/authService";

export const POST = withApi(async (_req, { userId }) => {
  await authService.resendVerification(userId);
  return Response.json({ ok: true });
}, { auth: "required", limit: ["resend", 5, 60 * 60 * 1000] });
