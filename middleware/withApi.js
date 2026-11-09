import { ZodError } from "zod";
import { ApiError, unauthorized, forbidden } from "../lib/errors.js";
import { rateLimit } from "../lib/rate-limit.js";
import { getUserId } from "../lib/auth.js";

const clientIp = (req) =>
  req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";

/**
 * Wraps a route handler with: CSRF origin check, rate limiting, auth, validation-error
 * mapping and centralized error handling.
 *   withApi(handler, { auth: "required" | "optional", limit: [name, max, windowMs] })
 */
export function withApi(handler, { auth = "optional", limit } = {}) {
  return async (request, routeCtx = {}) => {
    try {
      const ip = clientIp(request);

      if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
        const origin = request.headers.get("origin");
        if (origin) {
          const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
          let originHost = null;
          try { originHost = new URL(origin).host; } catch {}
          if (originHost !== host) throw forbidden("Cross-site request blocked");
        }
      }

      if (limit) {
        const [name, max, windowMs] = limit;
        const r = rateLimit(`${name}:${ip}`, max, windowMs);
        if (!r.ok) {
          return Response.json({ error: "Too many requests. Try again shortly." }, { status: 429, headers: { "Retry-After": String(r.retryAfter) } });
        }
      }

      const userId = await getUserId();
      if (auth === "required" && !userId) throw unauthorized();

      const ctx = {
        userId,
        ip,
        ua: request.headers.get("user-agent") || "",
        editKey: request.headers.get("x-edit-key") || null,
        params: routeCtx.params ? await routeCtx.params : {},
      };
      return await handler(request, ctx);
    } catch (err) {
      if (err instanceof ApiError) return Response.json({ error: err.message, ...err.extra }, { status: err.status });
      if (err instanceof ZodError) {
        return Response.json({ error: err.issues[0]?.message || "Invalid input" }, { status: 400 });
      }
      if (err instanceof SyntaxError) return Response.json({ error: "Invalid JSON" }, { status: 400 });
      console.error("[api]", err);
      return Response.json({ error: "Something went wrong" }, { status: 500 });
    }
  };
}
