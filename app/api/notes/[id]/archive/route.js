import { withApi } from "@/middleware/withApi";
import { noteService } from "@/services/noteService";

export const POST = withApi(async (req, ctx) => {
  const body = await req.json().catch(() => ({}));
  return Response.json(await noteService.archive(ctx.params.id, typeof body.archived === "boolean" ? body.archived : undefined, ctx));
}, { auth: "required" });
