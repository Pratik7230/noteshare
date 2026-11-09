import { getDb } from "@/lib/db.js";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDb();
    await db.query("SELECT 1");
    return Response.json({ status: "ok" });
  } catch {
    // Generic message: do not leak connection details.
    return Response.json({ status: "error" }, { status: 503 });
  }
}
