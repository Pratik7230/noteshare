"use client";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Ban, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { useAdminList, PageHeader, Tag, Pager, ListState, ActionDialog, fmtDate } from "./ui";

const TABS = [["open", "Open"], ["resolved", "Resolved"], ["dismissed", "Dismissed"], ["", "All"]];
const reasonTone = { illegal: "bad", abuse: "bad", copyright: "warn", spam: "warn", other: "muted" };

export default function Reports() {
  const [status, setStatus] = useState("open");
  const [page, setPage] = useState(1);
  const [dlg, setDlg] = useState(null); // { report, kind }
  const { data, loading, error, reload } = useAdminList("/admin/reports", { status, page });

  const resolve = async (r, body) => {
    try { await api(`/admin/reports/${r.id}`, { method: "PATCH", body }); toast.success(body.takedown ? "Note taken down and report resolved" : `Report ${body.status}`); reload(); }
    catch (e) { toast.error(e.message); throw e; }
  };

  return (
    <>
      <PageHeader title="Reports" subtitle="Notes reported by visitors." />
      <div role="tablist" aria-label="Report status" className="mb-4 flex gap-1 rounded-lg border bg-card p-1 w-fit">
        {TABS.map(([v, l]) => (
          <button key={l} role="tab" aria-selected={status === v} onClick={() => { setStatus(v); setPage(1); }}
            className={`rounded-md px-3 py-1.5 text-sm cursor-pointer ${status === v ? "bg-accent font-medium text-primary" : "text-muted-foreground"}`}>{l}</button>
        ))}
      </div>
      <ListState loading={loading} error={error} onRetry={reload} empty={data && data.items.length === 0 && (status === "open" ? "No open reports. Nice and quiet." : "Nothing here.")}>
        {data && (
          <>
            <ul className="grid gap-3">
              {data.items.map((r) => (
                <li key={r.id} className="rounded-xl border bg-card p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Tag tone={reasonTone[r.reason]}>{r.reason}</Tag>
                        <Tag tone={r.status === "open" ? "bad" : r.status === "resolved" ? "ok" : "muted"}>{r.status}</Tag>
                        {r.noteDisabled && <Tag tone="bad">note disabled</Tag>}
                      </div>
                      <p className="mt-2 font-medium"><Link href={`/admin/notes?q=${encodeURIComponent(r.noteSlug)}`} className="hover:text-primary">{r.noteTitle || "Untitled"}</Link> <span className="text-sm font-normal text-muted-foreground">/{r.noteSlug}</span></p>
                      <p className="mt-1 text-sm">{r.details || <span className="text-muted-foreground">No details given.</span>}</p>
                      <p className="mt-2 text-xs text-muted-foreground">Reported {fmtDate(r.createdAt)} by {r.reporterEmail || "an anonymous visitor"} · owner: {r.ownerEmail || "anonymous"}</p>
                      {r.resolvedAt && <p className="mt-1 text-xs text-muted-foreground">Closed {fmtDate(r.resolvedAt)}{r.resolutionNote ? `: ${r.resolutionNote}` : ""}</p>}
                    </div>
                    {r.status === "open" && (
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="destructive" onClick={() => setDlg({ r, kind: "takedown" })}><Ban /> Take down</Button>
                        <Button size="sm" variant="outline" onClick={() => setDlg({ r, kind: "resolved" })}><Check /> Resolve</Button>
                        <Button size="sm" variant="ghost" onClick={() => setDlg({ r, kind: "dismissed" })}><X /> Dismiss</Button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <Pager data={data} page={page} setPage={setPage} />
          </>
        )}
      </ListState>
      <ActionDialog open={!!dlg} onClose={() => setDlg(null)}
        title={dlg?.kind === "takedown" ? "Take down this note?" : dlg?.kind === "resolved" ? "Resolve this report?" : "Dismiss this report?"}
        description={dlg?.kind === "takedown" ? "The note becomes unavailable to everyone, and every open report on it is closed." : "Add an optional note for the audit trail."}
        confirmLabel={dlg?.kind === "takedown" ? "Take down" : dlg?.kind === "resolved" ? "Resolve" : "Dismiss"} destructive={dlg?.kind === "takedown"} field="Resolution note (optional)"
        onConfirm={(note) => resolve(dlg.r, { status: dlg.kind === "dismissed" ? "dismissed" : "resolved", takedown: dlg.kind === "takedown", resolutionNote: note || undefined })} />
    </>
  );
}
