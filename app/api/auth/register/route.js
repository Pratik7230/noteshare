import { withApi } from "@/middleware/withApi";
import { registerSchema } from "@/validators/auth";
import { authService, publicUser } from "@/services/authService";
import { setAuthCookie } from "@/lib/auth";

export const POST = withApi(async (req) => {
  const input = registerSchema.parse(await req.json());
  const user = await authService.register(input);
  await setAuthCookie(user.id);
  return Response.json({ user: publicUser(user) }, { status: 201 });
}, { limit: ["register", 8, 60 * 60 * 1000] });
