import { withApi } from "@/middleware/withApi";
import { updateNoteSchema } from "@/validators/notes";
import { noteService } from "@/services/noteService";
import { ApiError } from "@/lib/errors";

// [id] accepts either the note UUID or its slug.
export const GET = withApi(async (_req, ctx) => {
  try {
    return Response.json(await noteService.read(ctx.params.id, ctx), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof ApiError && e.status === 301) return Response.json({ redirectTo: e.extra.redirectTo });
    throw e;
  }
}, { limit: ["note-read", 300, 60 * 1000] });

export const PATCH = withApi(async (req, ctx) => {
  const input = updateNoteSchema.parse(await req.json());
  return Response.json(await noteService.update(ctx.params.id, input, ctx));
}, { limit: ["note-save", 240, 60 * 1000] });

export const DELETE = withApi(async (req, ctx) => {
  const permanent = new URL(req.url).searchParams.get("permanent") === "1";
  return Response.json(await noteService.remove(ctx.params.id, { permanent }, ctx));
});
