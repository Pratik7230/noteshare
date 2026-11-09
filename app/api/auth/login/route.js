import { withApi } from "@/middleware/withApi";
import { loginSchema } from "@/validators/auth";
import { authService, publicUser } from "@/services/authService";
import { setAuthCookie } from "@/lib/auth";

export const POST = withApi(async (req) => {
  const user = await authService.login(loginSchema.parse(await req.json()));
  await setAuthCookie(user.id);
  return Response.json({ user: publicUser(user) });
}, { limit: ["login", 10, 15 * 60 * 1000] });
