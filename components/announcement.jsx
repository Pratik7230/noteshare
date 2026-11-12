"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { api } from "@/lib/api-client";

const hash = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return String(h); };

/** Site-wide banner controlled from Admin > Settings. */
export function Announcement() {
  const [a, setA] = useState(null);
  useEffect(() => {
    api("/site").then((s) => {
      if (!s.announcement?.text) return;
      let dismissed = null;
      try { dismissed = localStorage.getItem("ns:announce"); } catch {}
      if (dismissed !== hash(s.announcement.text)) setA(s.announcement);
    }).catch(() => {});
  }, []);
  if (!a) return null;
  const dismiss = () => { try { localStorage.setItem("ns:announce", hash(a.text)); } catch {} setA(null); };
  return (
    <div role="status" className={`flex items-center justify-center gap-3 px-4 py-2 text-center text-sm ${a.level === "warning" ? "bg-amber-500 text-black" : "bg-primary text-primary-foreground"}`}>
      <span>{a.text}</span>
      <button onClick={dismiss} aria-label="Dismiss announcement" className="rounded p-0.5 opacity-80 hover:opacity-100 cursor-pointer"><X className="size-4" /></button>
    </div>
  );
}
