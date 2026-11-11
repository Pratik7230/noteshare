import { withApi } from "@/middleware/withApi";
import { userRepository } from "@/repositories/userRepository";
import { getObjectStream } from "@/lib/storage";
import { notFound } from "@/lib/errors";
import { UUID_RE } from "@/lib/slug";

// Profile pictures are visible to signed-in users only. URLs carry ?v=<timestamp> so they can be cached safely.
export const GET = withApi(async (_req, { params }) => {
  if (!UUID_RE.test(params.id)) throw notFound();
  const user = await userRepository.findByIdWithAvatarKey(params.id);
  if (!user?.avatarKey) throw notFound();
  const { stream, buffer } = await getObjectStream(user.avatarKey);
  return new Response(stream || buffer, {
    headers: {
      "Content-Type": "image/webp",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "private, max-age=86400",
    },
  });
}, { auth: "required" });
