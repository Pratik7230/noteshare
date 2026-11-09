"use client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { History, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import { Rendered, markdownToHtml, plainToHtml, sanitizeHtml } from "./rendered";

export function VersionsDialog({ open, onOpenChange, note, slug, contentType, onRestored, beforeOpen }) {
  const [versions, setVersions] = useState(null);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { const r = await api(`/notes/${note.id}/versions`, { slug }); setVersions(r.versions); setSelected(r.versions[0] || null); }
    catch (e) { toast.error(e.message); setVersions([]); }
  }, [note.id, slug]);

  useEffect(() => { if (open) { setVersions(null); beforeOpen?.().then(load); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const preview = (v) => (contentType === "rich" ? sanitizeHtml(v.content) : contentType === "markdown" ? markdownToHtml(v.content) : plainToHtml(v.content));

  const act = async (fn, msg) => {
    setBusy(true);
    try { await fn(); toast.success(msg); } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><History className="size-5" /> Version history</DialogTitle>
          <DialogDescription>Older versions are saved automatically as you edit. Restoring keeps your current text as a new version.</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end">
          <Button variant="outline" size="sm" disabled={busy} onClick={() => act(async () => { await api(`/notes/${note.id}/versions`, { method: "POST", slug }); await load(); }, "Version saved")}>Save current version</Button>
        </div>
        {versions === null ? (
          <div className="grid gap-2"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
        ) : versions.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No versions yet. They appear after you edit the note.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-[14rem_1fr]">
            <ul className="max-h-72 overflow-y-auto rounded-lg border p-1">
              {versions.map((v) => (
                <li key={v.id}>
                  <button onClick={() => setSelected(v)} className={`w-full rounded-md px-3 py-2 text-left text-sm cursor-pointer hover:bg-muted ${selected?.id === v.id ? "bg-accent" : ""}`}>
                    <span className="block font-medium">Version {v.versionNumber}</span>
                    <span className="block text-xs text-muted-foreground">{new Date(v.createdAt).toLocaleString()}</span>
                  </button>
                </li>
              ))}
            </ul>
            {selected && (
              <div className="min-w-0">
                <div className="max-h-72 overflow-y-auto rounded-lg border bg-background p-4">
                  <p className="mb-2 text-sm font-semibold">{selected.title || "Untitled"}</p>
                  <Rendered html={preview(selected)} />
                </div>
                <Button className="mt-3" disabled={busy} onClick={() => act(async () => {
                  await api(`/notes/${note.id}/versions/${selected.id}/restore`, { method: "POST", slug });
                  onRestored(); onOpenChange(false);
                }, `Restored version ${selected.versionNumber}`)}>
                  {busy && <Loader2 className="animate-spin" />} Restore this version
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
