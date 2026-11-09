import { withApi } from "@/middleware/withApi";
import { attachmentService, MAX_SIZE } from "@/services/attachmentService";
import { badRequest } from "@/lib/errors";

export const POST = withApi(async (req, ctx) => {
  if (Number(req.headers.get("content-length") || 0) > MAX_SIZE + 512 * 1024) throw badRequest("File is too large (max 5 MB)");
  const form = await req.formData();
  return Response.json(await attachmentService.add(ctx.params.id, form.get("file"), ctx), { status: 201 });
}, { limit: ["upload", 30, 60 * 60 * 1000] });

export const GET = withApi(async (_req, ctx) => Response.json({ attachments: await attachmentService.list(ctx.params.id, ctx) }));
