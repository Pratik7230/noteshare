"use client";
import Link from "next/link";
import { Archive, ArchiveRestore, Copy, ExternalLink, Globe, Link2, Lock, MoreHorizontal, RotateCcw, Star, Trash2, EyeOff, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn, timeAgo } from "@/lib/utils";

const PRIVACY = { public: { icon: Globe, label: "Public" }, unlisted: { icon: Link2, label: "Unlisted" }, private: { icon: Lock, label: "Private" } };

export function NoteCard({ note, view, layout, onAction }) {
  const P = PRIVACY[note.privacy] || PRIVACY.unlisted;
  const trash = view === "trash";
  return (
    <article className={cn("group relative rounded-xl border bg-card p-4 shadow-sm transition hover:border-primary/60 hover:shadow-md", layout === "list" && "flex items-center gap-4")}>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold">
          {trash ? (note.title || "Untitled") : (
            <Link href={`/n/${note.slug}`} className="after:absolute after:inset-0 after:content-['']">{note.title || "Untitled"}</Link>
          )}
        </h3>
        <p className={cn("mt-1 text-sm text-muted-foreground", layout === "grid" ? "line-clamp-3 min-h-[3.75rem]" : "line-clamp-1")}>{note.excerpt || "Empty note"}</p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <Badge><P.icon className="size-3" />{P.label}</Badge>
          {note.starred && <Star className="size-3.5 fill-current text-amber-500" aria-label="Starred" />}
          {note.expiresAt && <Badge><Clock className="size-3" />Expires {new Date(note.expiresAt).toLocaleDateString()}</Badge>}
          {note.tags.slice(0, 3).map((t) => <Badge key={t} className="bg-accent text-primary">#{t}</Badge>)}
          <span className="ml-auto">{timeAgo(note.updatedAt)}</span>
        </div>
      </div>
      <div className={cn("relative z-10", layout === "grid" && "absolute right-2 top-2")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${note.title || "Untitled"}`}><MoreHorizontal /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {trash ? (
              <>
                <DropdownMenuItem onSelect={() => onAction("restore", note)}><RotateCcw /> Restore</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onSelect={() => onAction("purge", note)}><Trash2 /> Delete forever</DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem onSelect={() => onAction("open", note)}><ExternalLink /> Open</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onAction("star", note)}><Star /> {note.starred ? "Remove star" : "Star"}</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onAction("copy", note)}><Link2 /> Copy link</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onAction("duplicate", note)}><Copy /> Duplicate</DropdownMenuItem>
                {note.isOwner && (
                  <>
                    <DropdownMenuItem onSelect={() => onAction("archive", note)}>{note.isArchived ? <ArchiveRestore /> : <Archive />} {note.isArchived ? "Unarchive" : "Archive"}</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onSelect={() => onAction("trash", note)}><Trash2 /> Move to trash</DropdownMenuItem>
                  </>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}
