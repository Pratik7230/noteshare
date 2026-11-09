import { withApi } from "@/middleware/withApi";
import { privacySchema } from "@/validators/notes";
import { noteService } from "@/services/noteService";

export const PATCH = withApi(async (req, ctx) => {
  const input = privacySchema.parse(await req.json());
  return Response.json(await noteService.updatePrivacy(ctx.params.id, input, ctx));
});
