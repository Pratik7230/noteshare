import { withApi } from "@/middleware/withApi";
import { shareService } from "@/services/shareService";

export const GET = withApi(async (_req, ctx) => Response.json(await shareService.analytics(ctx.params.id, ctx)));
