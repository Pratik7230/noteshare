"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, BookOpen, CalendarCheck, Code2, FileText, GraduationCap, ListChecks, Loader2 } from "lucide-react";

const ICONS = { CalendarCheck, BookOpen, ListChecks, FileText, Code2, GraduationCap };
import { Button } from "@/components/ui/button";
import { createNote } from "@/lib/api-client";

/** Creates a note (no account needed) and opens it. */
export function useStartNote() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const start = async (input = {}) => {
    if (busy) return;
    setBusy(true);
    try {
      const { slug } = await createNote(input);
      router.push(`/n/${slug}`);
    } catch (e) {
      toast.error(e.message);
      setBusy(false);
    }
  };
  return { start, busy };
}

export function StartWritingButton({ size = "lg", className, children = "Start writing" }) {
  const { start, busy } = useStartNote();
  return (
    <Button size={size} className={className} onClick={() => start()} disabled={busy}>
      {busy ? <Loader2 className="animate-spin" /> : null}
      {children}
      {!busy && <ArrowRight />}
    </Button>
  );
}

export function TemplateCard({ id, name, hint, icon }) {
  const Icon = ICONS[icon] || FileText;
  const { start, busy } = useStartNote();
  return (
    <button
      onClick={() => start({ template: id })}
      disabled={busy}
      className="group flex items-start gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition hover:border-primary hover:shadow-md disabled:opacity-60 cursor-pointer"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-primary"><Icon className="size-4" /></span>
      <span>
        <span className="block font-medium">{name}</span>
        <span className="block text-sm text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}
