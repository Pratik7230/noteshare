import { withApi } from "@/middleware/withApi";
import { noteService } from "@/services/noteService";

export const POST = withApi(async (_req, ctx) => {
  await noteService.restore(ctx.params.id, ctx);
  return Response.json({ ok: true });
}, { auth: "required" });
