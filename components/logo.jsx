import Link from "next/link";
import { NotebookPen } from "lucide-react";

export function Logo({ href = "/" }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground"><NotebookPen className="size-4" /></span>
      NoteShare
    </Link>
  );
}
