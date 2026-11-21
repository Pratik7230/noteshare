"use client";
import { LifeBuoy } from "lucide-react";
import { Tag, fmtDate } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

/** One message in a ticket thread. Bodies are plain text; React escapes them. */
export function TicketMessage({ m, staffTag = false }) {
  return (
    <li className={cn("rounded-xl border p-4 shadow-sm", m.isStaff ? "border-primary/30 bg-accent/40" : "bg-card")}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5 font-semibold">
          {m.isStaff && <LifeBuoy className="size-3.5 text-primary" aria-hidden="true" />}
          {m.author.name}
          {staffTag && m.isStaff && <Tag tone="info">staff</Tag>}
          {staffTag && m.author.email && <span className="font-normal text-muted-foreground">{m.author.email}</span>}
        </span>
        <time dateTime={m.createdAt} className="text-muted-foreground">{fmtDate(m.createdAt)}</time>
      </div>
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{m.body}</p>
    </li>
  );
}
