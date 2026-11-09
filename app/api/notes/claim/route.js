import { withApi } from "@/middleware/withApi";
import { claimSchema } from "@/validators/notes";
import { noteService } from "@/services/noteService";

export const POST = withApi(async (req, { userId }) => {
  const { items } = claimSchema.parse(await req.json());
  return Response.json({ claimed: await noteService.claim(items, userId) });
}, { auth: "required", limit: ["claim", 20, 60 * 60 * 1000] });
