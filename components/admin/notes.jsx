"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Search, Eye, ExternalLink, Ban, CircleCheck, Trash2, RotateCcw, KeyRound, TimerOff, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import { useAdminList, PageHeader, TableWrap, Th, Td, Tag, Pager, ListState, ActionDialog, fmtDate, fmtDay, fmtBytes } from "./ui";

const stateTag = (n) => (n.disabledAt ? <Tag tone="bad">disabled</Tag> : n.isDeleted ? <Tag>trash</Tag> : n.expiresAt && new Date(n.expiresAt) < new Date() ? <Tag tone="warn">expired</Tag> : <Tag tone="ok">live</Tag>);

function NoteDrawer({ id, onClose, onChanged }) {
  const [n, setN] = useState(null);
  const [dlg, setDlg] = useState(null);
  const load = (content) => api(`/admin/notes/${id}${content ? "?content=1" : ""}`).then(setN).catch((e) => { toast.error(e.message); onClose(); });
  useEffect(() => { if (id) { setN(null); load(false); } }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (body, ok) => {
    try { setN(await api(`/admin/notes/${id}`, { method: "PATCH", body })); toast.success(ok); onChanged(); }
    catch (e) { toast.error(e.message); throw e; }
  };

  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Note details</DialogTitle><DialogDescription>Viewing content is recorded in the audit log.</DialogDescription></DialogHeader>
        {!n ? <div className="grid gap-2"><Skeleton className="h-16" /><Skeleton className="h-32" /></div> : (
          <div className="grid gap-4">
            <div>
              <p className="text-lg font-semibold">{n.title || "Untitled"}</p>
              <p className="text-sm text-muted-foreground">/n/{n.slug} · {n.ownerEmail ? <>owned by {n.ownerName} ({n.ownerEmail})</> : "anonymous"}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {stateTag(n)}<Tag tone="info">{n.privacy}</Tag><Tag>{n.contentType}</Tag>
                {n.hasPassword && <Tag tone="warn"><Lock className="mr-1 size-3" />password</Tag>}
                {n.expiresAt && <Tag tone="warn">expires {fmtDay(n.expiresAt)}</Tag>}
              </div>
            </div>
            {n.disabledAt && <p className="rounded-lg border border-destructive/40 p-3 text-sm"><b>Disabled</b> {fmtDate(n.disabledAt)}: {n.disabledReason}</p>}
            <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              {[["Views", n.views], ["Unique", n.uniqueViews], ["Versions", n.versions], ["Size", fmtBytes(n.size)], ["Created", fmtDay(n.createdAt)], ["Updated", fmtDay(n.updatedAt)], ["View limit", n.maxViews ?? "none"], ["Link access", n.sharePermission]].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-muted p-2.5"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-semibold">{v}</dd></div>
              ))}
            </dl>

            {n.attachments.length > 0 && <p className="text-sm text-muted-foreground">{n.attachments.length} attachment(s): {n.attachments.map((a) => `${a.filename} (${fmtBytes(a.size)})`).join(", ")}. Manage them in Storage.</p>}

            {n.reports.length > 0 && (
              <div>
                <p className="mb-1.5 text-sm font-semibold">Reports</p>
                <ul className="grid gap-1 text-sm">{n.reports.map((r) => <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-1.5"><Tag tone={r.status === "open" ? "bad" : "muted"}>{r.status}</Tag><b>{r.reason}</b><span className="text-muted-foreground">{r.details || "no details"} · {r.reporterEmail || "anonymous"}</span></li>)}</ul>
              </div>
            )}

            <div>
              {n.excerpt == null
                ? <Button size="sm" variant="outline" onClick={() => load(true)}><Eye /> View content</Button>
                : <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/50 p-3 text-sm">{n.excerpt || "(empty)"}</pre>}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t pt-4">
              {n.disabledAt
                ? <Button size="sm" variant="outline" onClick={() => act({ action: "enable" }, "Note re-enabled")}><CircleCheck /> Re-enable</Button>
                : <Button size="sm" variant="outline" onClick={() => setDlg("disable")}><Ban /> Take down</Button>}
              {n.isDeleted
                ? <Button size="sm" variant="outline" onClick={() => act({ action: "restore" }, "Note restored")}><RotateCcw /> Restore</Button>
                : <Button size="sm" variant="outline" onClick={() => act({ action: "trash" }, "Moved to trash")}><Trash2 /> Move to trash</Button>}
              {n.hasPassword && <Button size="sm" variant="outline" onClick={() => act({ action: "removePassword" }, "Password removed")}><KeyRound /> Remove password</Button>}
              {n.expiresAt && <Button size="sm" variant="outline" onClick={() => act({ action: "clearExpiry" }, "Expiry cleared")}><TimerOff /> Clear expiry</Button>}
              <Select value={n.privacy} onChange={(e) => act({ action: "setPrivacy", privacy: e.target.value }, "Privacy updated").catch(() => {})} className="h-8 w-36" aria-label="Set privacy">
                <option value="public">Public</option><option value="unlisted">Unlisted</option><option value="private">Private</option>
              </Select>
              <Button asChild size="sm" variant="ghost"><Link href={`/n/${n.slug}`} target="_blank"><ExternalLink /> Open</Link></Button>
              <Button size="sm" variant="destructive" className="ml-auto" onClick={() => setDlg("delete")}><Trash2 /> Delete forever</Button>
            </div>
          </div>
        )}
        <ActionDialog open={dlg === "disable"} onClose={() => setDlg(null)} title="Take this note down?" description="Nobody can open it, including its owner, until it's re-enabled." confirmLabel="Take down" destructive field="Reason (shown to anyone who opens the note)" required
          onConfirm={(reason) => act({ action: "disable", reason }, "Note taken down")} />
        <ActionDialog open={dlg === "delete"} onClose={() => setDlg(null)} title="Delete this note forever?" description="The note, its versions and attachments are erased. This can't be undone." confirmLabel="Delete forever" destructive
          onConfirm={async () => { await api(`/admin/notes/${id}`, { method: "DELETE" }); toast.success("Note deleted"); onChanged(); onClose(); }} />
      </DialogContent>
    </Dialog>
  );
}

export default function Notes() {
  const [f, setF] = useState({ q: "", privacy: "", owner: "", state: "", password: "", sort: "updatedAt", order: "desc" });
  const [qInput, setQInput] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [checked, setChecked] = useState(new Set());
  const [bulk, setBulk] = useState(null);
  const { data, loading, error, reload } = useAdminList("/admin/notes", { ...f, page });

  useEffect(() => { const q = new URLSearchParams(location.search).get("q"); if (q) setQInput(q); }, []);
  useEffect(() => { const t = setTimeout(() => { setF((x) => ({ ...x, q: qInput })); setPage(1); }, 300); return () => clearTimeout(t); }, [qInput]);
  useEffect(() => setChecked(new Set()), [data]);
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setPage(1); };
  const toggle = (id) => setChecked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allChecked = data && data.items.length > 0 && data.items.every((n) => checked.has(n.id));

  const runBulk = async (action, reason) => {
    try {
      const r = await api("/admin/notes/bulk", { method: "POST", body: { ids: [...checked], action, reason } });
      toast.success(`${r.done} note(s) updated`); reload();
    } catch (e) { toast.error(e.message); throw e; }
  };

  return (
    <>
      <PageHeader title="Notes" subtitle="Find and moderate any note on the site." />
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-52 flex-1"><Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Search title, address or owner email" className="pl-9" aria-label="Search notes" /></div>
        <Select value={f.state} onChange={set("state")} className="w-36" aria-label="State"><option value="">Any state</option><option value="active">Live</option><option value="reported">Reported</option><option value="disabled">Disabled</option><option value="deleted">In trash</option><option value="expired">Expired</option></Select>
        <Select value={f.privacy} onChange={set("privacy")} className="w-36" aria-label="Privacy"><option value="">Any privacy</option><option value="public">Public</option><option value="unlisted">Unlisted</option><option value="private">Private</option></Select>
        <Select value={f.owner} onChange={set("owner")} className="w-36" aria-label="Owner type"><option value="">Any owner</option><option value="anonymous">Anonymous</option><option value="owned">With account</option></Select>
        <Select value={f.password} onChange={set("password")} className="w-36" aria-label="Password"><option value="">Any password</option><option value="yes">Protected</option></Select>
        <Select value={`${f.sort}:${f.order}`} onChange={(e) => { const [sort, order] = e.target.value.split(":"); setF({ ...f, sort, order }); setPage(1); }} className="w-40" aria-label="Sort">
          <option value="updatedAt:desc">Recently updated</option><option value="createdAt:desc">Newest</option><option value="createdAt:asc">Oldest</option><option value="views:desc">Most viewed</option><option value="size:desc">Largest</option>
        </Select>
      </div>

      {checked.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border bg-accent px-4 py-2.5 text-sm" role="region" aria-label="Bulk actions">
          <b>{checked.size} selected</b>
          <Button size="sm" variant="outline" onClick={() => setBulk("disable")}><Ban /> Take down</Button>
          <Button size="sm" variant="outline" onClick={() => runBulk("enable")}><CircleCheck /> Re-enable</Button>
          <Button size="sm" variant="destructive" onClick={() => setBulk("delete")}><Trash2 /> Delete</Button>
          <button className="ml-auto text-muted-foreground underline cursor-pointer" onClick={() => setChecked(new Set())}>Clear</button>
        </div>
      )}

      <ListState loading={loading} error={error} onRetry={reload} empty={data && data.items.length === 0 && "No notes match these filters."}>
        {data && (
          <>
            <TableWrap>
              <thead><tr>
                <Th className="w-8"><input type="checkbox" aria-label="Select all" checked={!!allChecked} onChange={() => setChecked(allChecked ? new Set() : new Set(data.items.map((n) => n.id)))} /></Th>
                <Th>Note</Th><Th>Owner</Th><Th>State</Th><Th>Privacy</Th><Th className="text-right">Views</Th><Th className="text-right">Size</Th><Th>Updated</Th>
              </tr></thead>
              <tbody>
                {data.items.map((n) => (
                  <tr key={n.id} className="hover:bg-muted/50">
                    <Td><input type="checkbox" aria-label={`Select ${n.title || n.slug}`} checked={checked.has(n.id)} onChange={() => toggle(n.id)} /></Td>
                    <Td className="cursor-pointer" onClick={() => setSelected(n.id)}>
                      <p className="max-w-56 truncate font-medium">{n.title || "Untitled"}</p>
                      <p className="max-w-56 truncate text-xs text-muted-foreground">/{n.slug}</p>
                    </Td>
                    <Td className="max-w-44 truncate text-muted-foreground">{n.ownerEmail || "anonymous"}</Td>
                    <Td><div className="flex flex-wrap gap-1.5">{stateTag(n)}{n.openReports > 0 && <Tag tone="bad">{n.openReports} report{n.openReports > 1 ? "s" : ""}</Tag>}{n.hasPassword && <Tag tone="warn">pw</Tag>}</div></Td>
                    <Td>{n.privacy}</Td>
                    <Td className="text-right tabular-nums">{n.views}</Td>
                    <Td className="text-right tabular-nums text-muted-foreground">{fmtBytes(n.size)}</Td>
                    <Td className="whitespace-nowrap text-muted-foreground">{fmtDay(n.updatedAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
            <Pager data={data} page={page} setPage={setPage} />
          </>
        )}
      </ListState>

      <NoteDrawer id={selected} onClose={() => setSelected(null)} onChanged={reload} />
      <ActionDialog open={bulk === "disable"} onClose={() => setBulk(null)} title={`Take down ${checked.size} notes?`} confirmLabel="Take down" destructive field="Reason" required onConfirm={(r) => runBulk("disable", r)} />
      <ActionDialog open={bulk === "delete"} onClose={() => setBulk(null)} title={`Delete ${checked.size} notes forever?`} description="This can't be undone." confirmLabel="Delete" destructive confirmText="DELETE" onConfirm={() => runBulk("delete")} />
    </>
  );
}
