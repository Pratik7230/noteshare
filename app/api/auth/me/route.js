import { withApi } from "@/middleware/withApi";
import { userRepository } from "@/repositories/userRepository";
import { publicUser } from "@/services/authService";

export const GET = withApi(async (_req, { userId }) => {
  if (!userId) return Response.json({ user: null });
  const user = await userRepository.findById(userId);
  return Response.json({ user: user ? publicUser(user) : null });
});
