import { withApi } from "@/middleware/withApi";
import { adminService } from "@/services/adminService";
import { userRepository } from "@/repositories/userRepository";
import { userActionSchema } from "@/validators/admin";

export const GET = withApi(async (_req, { params }) => Response.json(await adminService.getUser(params.id)), { auth: "admin", limit: ["admin", 600, 60 * 1000] });

export const PATCH = withApi(async (req, { params, userId }) => {
  const admin = await userRepository.findById(userId);
  return Response.json(await adminService.userAction(admin, params.id, userActionSchema.parse(await req.json())));
}, { auth: "admin", limit: ["admin", 600, 60 * 1000] });

export const DELETE = withApi(async (_req, { params, userId }) => {
  await adminService.deleteUser(await userRepository.findById(userId), params.id);
  return Response.json({ ok: true });
}, { auth: "admin", limit: ["admin", 600, 60 * 1000] });
