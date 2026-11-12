import { withApi } from "@/middleware/withApi";
import { adminService } from "@/services/adminService";
import { userRepository } from "@/repositories/userRepository";

export const DELETE = withApi(async (_req, { params, userId }) => {
  await adminService.deleteAttachment(await userRepository.findById(userId), params.id);
  return Response.json({ ok: true });
}, { auth: "admin", limit: ["admin", 600, 60 * 1000] });
