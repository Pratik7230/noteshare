import { z } from "zod";
import { withApi } from "@/middleware/withApi";
import { noteService, loadForManage } from "@/services/noteService";

const schema = z.object({ sharePermission: z.enum(["view", "edit"]).optional() });

// Returns the shareable URL; optionally switches between read-only and editable sharing.
export const POST = withApi(async (req, ctx) => {
  const input = schema.parse(await req.json().catch(() => ({})));
  const { note } = await loadForManage(ctx.params.id, ctx);
  let sharePermission = note.sharePermission;
  if (input.sharePermission) {
    const r = await noteService.updatePrivacy(note.id, { sharePermission: input.sharePermission }, ctx);
    sharePermission = r.sharePermission;
  }
  const base = process.env.APP_URL || new URL(req.url).origin;
  return Response.json({ url: `${base}/n/${note.slug}`, sharePermission, privacy: note.privacy });
});
