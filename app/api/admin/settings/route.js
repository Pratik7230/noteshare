import { withApi } from "@/middleware/withApi";
import { adminService } from "@/services/adminService";
import { userRepository } from "@/repositories/userRepository";
import { settingsSchema } from "@/validators/admin";

export const GET = withApi(async () => Response.json({ settings: await adminService.getSettings() }), { auth: "admin", limit: ["admin", 600, 60 * 1000] });

export const PUT = withApi(async (req, { userId }) => {
  const saved = await adminService.updateSettings(await userRepository.findById(userId), settingsSchema.parse(await req.json()));
  return Response.json({ settings: saved });
}, { auth: "admin", limit: ["admin", 600, 60 * 1000] });
