// Runs once when the Next.js server starts: schedules the expired-note cleanup job.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { runCleanup } = await import("./services/cleanupService.js");
  const tick = () => runCleanup().then((r) => (r.expired || r.trashed) && console.log("[cleanup]", r)).catch((e) => console.error("[cleanup] failed", e.message));
  setTimeout(tick, 15_000);
  setInterval(tick, 10 * 60 * 1000).unref?.();
}
