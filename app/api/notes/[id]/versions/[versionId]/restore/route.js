import { withApi } from "@/middleware/withApi";
import { versionService } from "@/services/noteService";

export const POST = withApi(async (_req, ctx) => Response.json(await versionService.restore(ctx.params.id, ctx.params.versionId, ctx)));
