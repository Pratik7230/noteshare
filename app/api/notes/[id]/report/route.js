import { withApi } from "@/middleware/withApi";
import { reportCreateSchema } from "@/validators/admin";
import { reportService } from "@/services/adminService";

export const POST = withApi(async (req, ctx) =>
  Response.json(await reportService.create(ctx.params.id, reportCreateSchema.parse(await req.json()), ctx), { status: 201 }),
  { limit: ["report", 10, 60 * 60 * 1000] });
