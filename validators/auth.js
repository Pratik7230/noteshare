import { z } from "zod";

const password = z.string().min(8, "At least 8 characters").max(128);
export const registerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(255),
  password,
});
export const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(128) });
export const forgotSchema = z.object({ email: z.string().trim().toLowerCase().email() });
export const resetSchema = z.object({ token: z.string().min(10).max(200), password });
export const tokenSchema = z.object({ token: z.string().min(10).max(200) });
