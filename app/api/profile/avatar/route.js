import { withApi } from "@/middleware/withApi";
import { profileService, AVATAR_MAX_BYTES } from "@/services/profileService";
import { badRequest } from "@/lib/errors";

export const POST = withApi(async (req, { userId }) => {
  if (Number(req.headers.get("content-length") || 0) > AVATAR_MAX_BYTES + 256 * 1024) throw badRequest("Image is too large (max 2 MB)");
  const form = await req.formData();
  return Response.json({ user: await profileService.setAvatar(userId, form.get("file")) });
}, { auth: "required", limit: ["avatar", 20, 60 * 60 * 1000] });

export const DELETE = withApi(async (_req, { userId }) =>
  Response.json({ user: await profileService.removeAvatar(userId) }), { auth: "required" });
