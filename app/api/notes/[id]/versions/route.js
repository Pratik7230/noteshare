import { withApi } from "@/middleware/withApi";
import { versionService } from "@/services/noteService";

export const GET = withApi(async (_req, ctx) => Response.json({ versions: await versionService.list(ctx.params.id, ctx) }));
export const POST = withApi(async (_req, ctx) => Response.json(await versionService.createManual(ctx.params.id, ctx), { status: 201 }));
