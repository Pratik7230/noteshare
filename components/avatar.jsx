"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const initials = (name = "") => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

/** Profile picture with an initials fallback. `user` needs { name, avatarUrl }. */
export function Avatar({ user, size = 36, className }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [user?.avatarUrl]);
  const showImg = user?.avatarUrl && !failed;
  return (
    <span
      className={cn("inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-accent font-semibold text-primary select-none", className)}
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.38) }}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatarUrl} alt={`${user.name}'s profile picture`} width={size} height={size} className="size-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <span aria-hidden="true">{initials(user?.name)}</span>
      )}
    </span>
  );
}
