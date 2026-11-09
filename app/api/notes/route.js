import { withApi } from "@/middleware/withApi";
import { createNoteSchema } from "@/validators/notes";
import { noteService } from "@/services/noteService";

export const POST = withApi(async (req, ctx) => {
  const body = await req.json().catch(() => ({}));
  const { note, editKey } = await noteService.create(createNoteSchema.parse(body), ctx);
  return Response.json({ slug: note.slug, id: note.id, editKey }, { status: 201 });
}, { limit: ["note-create", 40, 60 * 60 * 1000] });

export const GET = withApi(async (req, { userId }) => {
  const q = Object.fromEntries(new URL(req.url).searchParams);
  return Response.json(await noteService.list(userId, q));
}, { auth: "required" });
