import { withApi } from "@/middleware/withApi";
import { adminService } from "@/services/adminService";
import { userRepository } from "@/repositories/userRepository";

export const GET = withApi(async (req) => Response.json(await adminService.listNotes(Object.fromEntries(new URL(req.url).searchParams))), { auth: "admin", limit: ["admin", 600, 60 * 1000] });
