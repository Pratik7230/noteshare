import { z } from "zod";

export const userActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("suspend"), reason: z.string().trim().min(3, "Give a reason (3+ characters)").max(255) }),
  z.object({ action: z.literal("unsuspend") }),
  z.object({ action: z.literal("setRole"), role: z.enum(["user", "admin"]) }),
  z.object({ action: z.literal("verifyEmail") }),
  z.object({ action: z.literal("sendReset") }),
  z.object({ action: z.literal("resendVerification") }),
]);

export const noteActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("disable"), reason: z.string().trim().min(3, "Give a reason (3+ characters)").max(255) }),
  z.object({ action: z.literal("enable") }),
  z.object({ action: z.literal("restore") }),
  z.object({ action: z.literal("trash") }),
  z.object({ action: z.literal("setPrivacy"), privacy: z.enum(["public", "unlisted", "private"]) }),
  z.object({ action: z.literal("removePassword") }),
  z.object({ action: z.literal("clearExpiry") }),
]);

export const bulkNotesSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  action: z.enum(["disable", "enable", "delete"]),
  reason: z.string().trim().max(255).optional(),
});

export const reportCreateSchema = z.object({
  reason: z.enum(["spam", "abuse", "illegal", "copyright", "other"]),
  details: z.string().trim().max(500).optional(),
});

export const reportResolveSchema = z.object({
  status: z.enum(["resolved", "dismissed"]),
  takedown: z.boolean().optional(),
  resolutionNote: z.string().trim().max(500).optional(),
});

export const settingsSchema = z.object({
  registrationOpen: z.boolean(),
  anonymousNotesEnabled: z.boolean(),
  announcement: z.object({
    enabled: z.boolean(),
    text: z.string().trim().max(300),
    level: z.enum(["info", "warning"]),
  }),
});
