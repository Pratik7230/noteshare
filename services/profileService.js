import bcrypt from "bcryptjs";
import sharp from "sharp";
import { getDb } from "../lib/db.js";
import { Note } from "../entities/index.js";
import { userRepository } from "../repositories/userRepository.js";
import { badRequest, conflict, notFound } from "../lib/errors.js";
import { uploadProfilePicture, deleteProfilePicture } from "../lib/storage.js";
import { publicUser, sendVerification } from "./authService.js";
import { noteService } from "./noteService.js";

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_FORMATS = ["jpeg", "png", "webp"]; // SVG and animated formats are rejected on purpose

async function requirePassword(userId, password) {
  const user = await userRepository.findByIdWithPassword(userId);
  if (!user) throw notFound("Account not found");
  if (!(await bcrypt.compare(password, user.password))) throw badRequest("Incorrect password");
  return user;
}

export const profileService = {
  async update(userId, { name, bio }) {
    await userRepository.update(userId, { name, bio: bio || null });
    return publicUser(await userRepository.findById(userId));
  },

  /** Re-encodes to a 256x256 WebP: strips EXIF/GPS data, normalises size, and neutralises odd files. */
  async setAvatar(userId, file) {
    if (!file || typeof file.arrayBuffer !== "function") throw badRequest("No image uploaded");
    if (file.size > AVATAR_MAX_BYTES) throw badRequest("Image is too large (max 2 MB)");
    const input = Buffer.from(await file.arrayBuffer());

    let output;
    try {
      const img = sharp(input, { limitInputPixels: 40_000_000, failOn: "error" });
      const meta = await img.metadata();
      if (!AVATAR_FORMATS.includes(meta.format)) throw new Error("format");
      output = await img.rotate().resize(256, 256, { fit: "cover" }).webp({ quality: 85 }).toBuffer();
    } catch {
      throw badRequest("Please upload a PNG, JPEG or WebP image");
    }

    const before = await userRepository.findByIdWithAvatarKey(userId);
    const stored = await uploadProfilePicture(userId, output, "image/webp", "avatar.webp");
    await userRepository.update(userId, { avatarKey: stored.storageKey, avatarUpdatedAt: new Date() });
    if (before?.avatarKey) await deleteProfilePicture(before.avatarKey).catch(() => {});
    return publicUser(await userRepository.findById(userId));
  },

  async removeAvatar(userId) {
    const user = await userRepository.findByIdWithAvatarKey(userId);
    if (user?.avatarKey) await deleteProfilePicture(user.avatarKey).catch(() => {});
    await userRepository.update(userId, { avatarKey: null, avatarUpdatedAt: null });
    return publicUser(await userRepository.findById(userId));
  },

  async changePassword(userId, { currentPassword, newPassword }) {
    await requirePassword(userId, currentPassword);
    if (currentPassword === newPassword) throw badRequest("Choose a different password");
    await userRepository.update(userId, { password: await bcrypt.hash(newPassword, 12) });
  },

  async changeEmail(userId, { email, password }) {
    const user = await requirePassword(userId, password);
    if (user.email === email) throw badRequest("That is already your email");
    if (await userRepository.findByEmail(email)) throw conflict("An account with this email already exists");
    await userRepository.update(userId, { email, emailVerified: false });
    const fresh = await userRepository.findById(userId);
    await sendVerification(fresh);
    return publicUser(fresh);
  },

  async deleteAccount(userId, { password }) {
    await requirePassword(userId, password);
    await this.purgeUser(userId);
  },

  /** Permanently deletes a user and everything they own (also used by admins). */
  async purgeUser(userId) {
    const db = await getDb();
    const owned = await db.getRepository(Note).find({ where: { ownerId: userId }, select: { id: true } });
    for (const n of owned) await noteService.hardDelete(n.id); // removes attachments from storage too
    const u = await userRepository.findByIdWithAvatarKey(userId);
    if (u?.avatarKey) await deleteProfilePicture(u.avatarKey).catch(() => {});
    await userRepository.remove(userId);
  },
};
