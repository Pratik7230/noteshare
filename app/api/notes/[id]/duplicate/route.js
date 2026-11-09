import { withApi } from "@/middleware/withApi";
import { noteService } from "@/services/noteService";

export const POST = withApi(async (_req, ctx) => Response.json(await noteService.duplicate(ctx.params.id, ctx), { status: 201 }),
  { limit: ["note-create", 40, 60 * 60 * 1000] });
