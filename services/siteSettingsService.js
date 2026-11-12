import { getDb } from "../lib/db.js";
import { SiteSetting } from "../entities/index.js";

export const DEFAULT_SETTINGS = {
  registrationOpen: true,
  anonymousNotesEnabled: true,
  announcement: { enabled: false, text: "", level: "info" }, // level: info | warning
};

let cached = null;
let cachedAt = 0;

export async function getSettings() {
  if (cached && Date.now() - cachedAt < 10_000) return cached;
  const row = await (await getDb()).getRepository(SiteSetting).findOne({ where: { key: "site" } });
  cached = { ...DEFAULT_SETTINGS, ...(row?.value || {}), announcement: { ...DEFAULT_SETTINGS.announcement, ...(row?.value?.announcement || {}) } };
  cachedAt = Date.now();
  return cached;
}

export async function saveSettings(next) {
  const repo = (await getDb()).getRepository(SiteSetting);
  await repo.save({ key: "site", value: next });
  cached = null;
  return getSettings();
}

/** What anonymous visitors may know. */
export async function publicSettings() {
  const s = await getSettings();
  return { registrationOpen: s.registrationOpen, anonymousNotesEnabled: s.anonymousNotesEnabled, announcement: s.announcement.enabled ? s.announcement : null };
}
