import { withApi } from "@/middleware/withApi";
import { tagsSchema } from "@/validators/notes";
import { noteService } from "@/services/noteService";

export const PUT = withApi(async (req, ctx) => Response.json(await noteService.setTags(ctx.params.id, tagsSchema.parse(await req.json()).tags, ctx)), { auth: "required" });
