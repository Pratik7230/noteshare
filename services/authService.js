import bcrypt from "bcryptjs";
import { userRepository } from "../repositories/userRepository.js";
import { conflict, badRequest } from "../lib/errors.js";
import { randomToken, sha256 } from "../lib/crypto.js";
import { sendMail } from "../lib/mailer.js";

const appUrl = () => process.env.APP_URL || "http://localhost:3000";
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO5lA1p0k1d5Yp3h8F1m6y9aGx2x7w7yS"; // for constant-ish timing
export const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, emailVerified: u.emailVerified });

async function sendVerification(user) {
  const token = randomToken();
  await userRepository.update(user.id, { emailVerifyTokenHash: sha256(token) });
  await sendMail({
    to: user.email, subject: "Verify your NoteShare email",
    text: `Hi ${user.name},\n\nVerify your email: ${appUrl()}/verify-email?token=${token}\n`,
  });
}

export const authService = {
  async register({ name, email, password }) {
    if (await userRepository.findByEmail(email)) throw conflict("An account with this email already exists");
    const user = await userRepository.create({ name, email, password: await bcrypt.hash(password, 12) });
    await sendVerification(user);
    return user;
  },
  async login({ email, password }) {
    const user = await userRepository.findByEmailWithPassword(email);
    const ok = await bcrypt.compare(password, user?.password || DUMMY_HASH);
    if (!user || !ok) throw badRequest("Invalid email or password");
    return user;
  },
  async forgotPassword(email) {
    const user = await userRepository.findByEmail(email);
    if (!user) return; // never reveal whether the email exists
    const token = randomToken();
    await userRepository.update(user.id, {
      resetTokenHash: sha256(token), resetTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    await sendMail({ to: email, subject: "Reset your NoteShare password", text: `Reset link (valid 1 hour): ${appUrl()}/reset-password?token=${token}\n` });
  },
  async resetPassword(token, password) {
    const user = await userRepository.findByResetHash(sha256(token));
    if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) throw badRequest("This reset link is invalid or has expired");
    await userRepository.update(user.id, {
      password: await bcrypt.hash(password, 12), resetTokenHash: null, resetTokenExpiresAt: null,
    });
  },
  async verifyEmail(token) {
    const user = await userRepository.findByVerifyHash(sha256(token));
    if (!user) throw badRequest("This verification link is invalid");
    await userRepository.update(user.id, { emailVerified: true, emailVerifyTokenHash: null });
  },
  async resendVerification(userId) {
    const user = await userRepository.findById(userId);
    if (user && !user.emailVerified) await sendVerification(user);
  },
};
