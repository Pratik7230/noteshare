import { withApi } from "@/middleware/withApi";
import { adminService } from "@/services/adminService";
import { userRepository } from "@/repositories/userRepository";

export const POST = withApi(async (_req, { userId }) => Response.json(await adminService.runCleanup(await userRepository.findById(userId))), { auth: "admin", limit: ["admin", 600, 60 * 1000] });
