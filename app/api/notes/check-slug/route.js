import { withApi } from "@/middleware/withApi";
import { noteService } from "@/services/noteService";

export const GET = withApi(async (req) => {
  const sp = new URL(req.url).searchParams;
  return Response.json(await noteService.checkSlug(sp.get("slug") || "", sp.get("except")));
}, { limit: ["slug-check", 60, 60 * 1000] });
