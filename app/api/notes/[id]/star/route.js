import { withApi } from "@/middleware/withApi";
import { noteService } from "@/services/noteService";

export const POST = withApi(async (_req, ctx) => Response.json(await noteService.toggleStar(ctx.params.id, ctx)), { auth: "required" });
