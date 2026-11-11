import { withApi } from "@/middleware/withApi";
import { changeEmailSchema } from "@/validators/profile";
import { profileService } from "@/services/profileService";

export const POST = withApi(async (req, { userId }) => {
  const user = await profileService.changeEmail(userId, changeEmailSchema.parse(await req.json()));
  return Response.json({ user });
}, { auth: "required", limit: ["change-email", 5, 60 * 60 * 1000] });
