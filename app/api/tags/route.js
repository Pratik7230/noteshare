import { withApi } from "@/middleware/withApi";
import { noteService } from "@/services/noteService";

export const GET = withApi(async (_req, { userId }) => Response.json({ tags: await noteService.userTags(userId) }), { auth: "required" });
