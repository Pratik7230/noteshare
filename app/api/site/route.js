import { withApi } from "@/middleware/withApi";
import { publicSettings } from "@/services/siteSettingsService";

// Public: announcement banner and feature flags the UI needs.
export const GET = withApi(async () => Response.json(await publicSettings(), { headers: { "Cache-Control": "public, max-age=15" } }),
  { limit: ["site", 120, 60 * 1000] });
