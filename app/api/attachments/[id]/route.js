import { withApi } from "@/middleware/withApi";
import { attachmentService } from "@/services/attachmentService";

export const GET = withApi(async (_req, ctx) => {
  const { a, stream, buffer } = await attachmentService.fetch(ctx.params.id, ctx);
  const inline = a.mimeType.startsWith("image/");
  const body = stream || buffer;
  return new Response(body, {
    headers: {
      "Content-Type": a.mimeType,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${a.filename}"`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "private, max-age=300",
    },
  });
});

export const DELETE = withApi(async (_req, ctx) => {
  await attachmentService.remove(ctx.params.id, ctx);
  return Response.json({ ok: true });
});
