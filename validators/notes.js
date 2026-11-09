import { z } from "zod";
import { TEMPLATES } from "../lib/templates.js";

const iso = z.string().datetime({ offset: true }).nullable();
export const createNoteSchema = z.object({
  title: z.string().max(255).optional(),
  content: z.string().max(1_000_000).optional(),
  contentType: z.enum(["rich", "markdown", "plain"]).optional(),
  slug: z.string().max(64).optional(),
  template: z.enum(Object.keys(TEMPLATES)).optional(),
  expiresAt: iso.optional(),
});

export const updateNoteSchema = z.object({
  title: z.string().max(255).optional(),
  content: z.string().max(1_000_000).optional(),
  contentType: z.enum(["rich", "markdown", "plain"]).optional(),
  slug: z.string().max(64).optional(),
  expiresAt: iso.optional(),
});

export const privacySchema = z.object({
  privacy: z.enum(["public", "unlisted", "private"]).optional(),
  sharePermission: z.enum(["view", "edit"]).optional(),
  password: z.string().min(4).max(128).nullable().optional(), // null removes password
  accessExpiresAt: iso.optional(),
  maxViews: z.number().int().positive().max(1_000_000).nullable().optional(),
});

export const verifyPasswordSchema = z.object({ password: z.string().min(1).max(128) });
export const inviteSchema = z.object({ email: z.string().trim().toLowerCase().email(), permission: z.enum(["VIEW", "EDIT"]) });
export const tagsSchema = z.object({ tags: z.array(z.string().trim().min(1).max(50)).max(20) });
export const claimSchema = z.object({
  items: z.array(z.object({ slug: z.string().max(64), editKey: z.string().max(200) })).max(200),
});
