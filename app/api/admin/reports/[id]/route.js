import { withApi } from "@/middleware/withApi";
import { adminService } from "@/services/adminService";
import { userRepository } from "@/repositories/userRepository";
import { reportResolveSchema } from "@/validators/admin";

export const PATCH = withApi(async (req, { params, userId }) => {
  await adminService.resolveReport(await userRepository.findById(userId), params.id, reportResolveSchema.parse(await req.json()));
  return Response.json({ ok: true });
}, { auth: "admin", limit: ["admin", 600, 60 * 1000] });
