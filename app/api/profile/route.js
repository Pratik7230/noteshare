import { withApi } from "@/middleware/withApi";
import { profileSchema, deleteAccountSchema } from "@/validators/profile";
import { profileService } from "@/services/profileService";
import { clearAuthCookie } from "@/lib/auth";

export const PATCH = withApi(async (req, { userId }) => {
  const user = await profileService.update(userId, profileSchema.parse(await req.json()));
  return Response.json({ user });
}, { auth: "required", limit: ["profile", 30, 60 * 60 * 1000] });

export const DELETE = withApi(async (req, { userId }) => {
  await profileService.deleteAccount(userId, deleteAccountSchema.parse(await req.json()));
  await clearAuthCookie();
  return Response.json({ ok: true });
}, { auth: "required", limit: ["delete-account", 5, 60 * 60 * 1000] });
