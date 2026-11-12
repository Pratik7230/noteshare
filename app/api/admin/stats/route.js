import { withApi } from "@/middleware/withApi";
import { adminService } from "@/services/adminService";
import { userRepository } from "@/repositories/userRepository";

export const GET = withApi(async () => Response.json(await adminService.stats()), { auth: "admin", limit: ["admin", 600, 60 * 1000] });
