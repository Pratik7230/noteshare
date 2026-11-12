import { withApi } from "@/middleware/withApi";
import { adminService } from "@/services/adminService";
import { userRepository } from "@/repositories/userRepository";
import { noteActionSchema } from "@/validators/admin";

export const GET = withApi(async (req, { params, userId }) => {
  const content = new URL(req.url).searchParams.get("content") === "1";
  return Response.json(await adminService.getNote(await userRepository.findById(userId), params.id, { content }));
}, { auth: "admin", limit: ["admin", 600, 60 * 1000] });

export const PATCH = withApi(async (req, { params, userId }) => {
  const admin = await userRepository.findById(userId);
  await adminService.noteAction(admin, params.id, noteActionSchema.parse(await req.json()));
  return Response.json(await adminService.getNote(admin, params.id, { content: false }));
}, { auth: "admin", limit: ["admin", 600, 60 * 1000] });

export const DELETE = withApi(async (_req, { params, userId }) => {
  await adminService.deleteNote(await userRepository.findById(userId), params.id);
  return Response.json({ ok: true });
}, { auth: "admin", limit: ["admin", 600, 60 * 1000] });
