import { z } from "zod";
import { withApi } from "@/middleware/withApi";
import { inviteSchema } from "@/validators/notes";
import { shareService } from "@/services/shareService";

export const POST = withApi(async (req, ctx) =>
  Response.json(await shareService.invite(ctx.params.id, inviteSchema.parse(await req.json()), ctx)),
  { auth: "required", limit: ["invite", 20, 60 * 60 * 1000] });

export const GET = withApi(async (_req, ctx) => Response.json(await shareService.collaborators(ctx.params.id, ctx)), { auth: "required" });

const removeSchema = z.object({ userId: z.string().uuid().optional(), invitationId: z.string().uuid().optional() });
export const DELETE = withApi(async (req, ctx) => {
  await shareService.removeAccess(ctx.params.id, removeSchema.parse(await req.json()), ctx);
  return Response.json({ ok: true });
}, { auth: "required" });
