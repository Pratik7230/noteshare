import { z } from "zod";

const password = z.string().min(8, "At least 8 characters").max(128);
export const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  bio: z.string().trim().max(280, "Bio can be up to 280 characters").optional(),
});
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: password });
export const changeEmailSchema = z.object({ email: z.string().trim().toLowerCase().email().max(255), password: z.string().min(1).max(128) });
export const deleteAccountSchema = z.object({ password: z.string().min(1).max(128) });
