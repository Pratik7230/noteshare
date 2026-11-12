import { withApi } from "@/middleware/withApi";
import { adminService } from "@/services/adminService";
import { userRepository } from "@/repositories/userRepository";
import { bulkNotesSchema } from "@/validators/admin";

export const POST = withApi(async (req, { userId }) =>
  Response.json(await adminService.bulkNotes(await userRepository.findById(userId), bulkNotesSchema.parse(await req.json()))), { auth: "admin", limit: ["admin", 600, 60 * 1000] });
