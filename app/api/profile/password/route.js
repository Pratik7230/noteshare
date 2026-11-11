import { withApi } from "@/middleware/withApi";
import { changePasswordSchema } from "@/validators/profile";
import { profileService } from "@/services/profileService";

export const POST = withApi(async (req, { userId }) => {
  await profileService.changePassword(userId, changePasswordSchema.parse(await req.json()));
  return Response.json({ ok: true });
}, { auth: "required", limit: ["change-password", 8, 60 * 60 * 1000] });
