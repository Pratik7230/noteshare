import { withApi } from "@/middleware/withApi";
import { verifyPasswordSchema } from "@/validators/notes";
import { noteService } from "@/services/noteService";
import { setUnlockCookie } from "@/lib/auth";

export const POST = withApi(async (req, ctx) => {
  const { password } = verifyPasswordSchema.parse(await req.json());
  const note = await noteService.verifyPassword(ctx.params.id, password, ctx);
  await setUnlockCookie(note.id); // verified server-side; the password never reaches the client
  return Response.json({ ok: true });
}, { limit: ["note-pw", 10, 10 * 60 * 1000] });
