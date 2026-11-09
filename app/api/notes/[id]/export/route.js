import { withApi } from "@/middleware/withApi";
import { exportService } from "@/services/exportService";

export const GET = withApi(async (req, ctx) => {
  const format = new URL(req.url).searchParams.get("format") || "txt";
  const { body, type, filename } = await exportService.export(ctx.params.id, format, ctx);
  return new Response(body, {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}, { limit: ["export", 60, 60 * 1000] });
