import { withApi } from "@/middleware/withApi";
import { clearAuthCookie } from "@/lib/auth";

export const POST = withApi(async () => {
  await clearAuthCookie();
  return Response.json({ ok: true });
});
