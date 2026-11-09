import { runCleanup } from "@/services/cleanupService";

// Optional external trigger (e.g. a platform cron): Authorization: Bearer $CRON_SECRET
export async function POST(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "Forbidden" }, { status: 403 });
  return Response.json(await runCleanup());
}
