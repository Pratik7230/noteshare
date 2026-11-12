"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Search, ShieldCheck, ShieldOff, Ban, CircleCheck, MailCheck, KeyRound, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/avatar";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api-client";
import { useAdminList, PageHeader, TableWrap, Th, Td, Tag, Pager, ListState, ActionDialog, fmtDay, fmtDate, fmtBytes } from "./ui";

function UserDrawer({ id, onClose, onChanged }) {
  const { user: me } = useAuth();
  const [u, setU] = useState(null);
  const [dlg, setDlg] = useState(null);

  useEffect(() => { if (id) { setU(null); api(`/admin/users/${id}`).then(setU).catch((e) => { toast.error(e.message); onClose(); }); } }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (body, ok) => {
    try { setU(await api(`/admin/users/${id}`, { method: "PATCH", body })); toast.success(ok); onChanged(); }
    catch (e) { toast.error(e.message); throw e; }
  };
  const self = u?.id === me?.id;

  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>User details</DialogTitle><DialogDescription>Actions here are recorded in the audit log.</DialogDescription></DialogHeader>
        {!u ? <div className="grid gap-2"><Skeleton className="h-16" /><Skeleton className="h-32" /></div> : (
          <div className="grid gap-4">
            <div className="flex items-center gap-3">
              <Avatar user={u} size={56} />
              <div className="min-w-0">
                <p className="truncate font-semibold">{u.name} {self && <span className="text-xs text-muted-foreground">(you)</span>}</p>
                <p className="truncate text-sm text-muted-foreground">{u.email}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Tag tone={u.role === "admin" ? "info" : "muted"}>{u.role}</Tag>
                  <Tag tone={u.emailVerified ? "ok" : "warn"}>{u.emailVerified ? "verified" : "unverified"}</Tag>
                  {u.suspendedAt && <Tag tone="bad">suspended</Tag>}
                </div>
              </div>
            </div>
            {u.bio && <p className="rounded-lg bg-muted p-3 text-sm">{u.bio}</p>}
            {u.suspendedAt && <p className="rounded-lg border border-destructive/40 p-3 text-sm"><b>Suspended</b> {fmtDate(u.suspendedAt)}: {u.suspendedReason}</p>}
            <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              {[["Notes", u.noteCount], ["Views", u.stats.views], ["Files", u.stats.attachments], ["Storage", fmtBytes(u.stats.storageBytes)], ["Joined", fmtDay(u.createdAt)], ["Last login", fmtDay(u.lastLoginAt)]].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-muted p-2.5"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-semibold">{v}</dd></div>
              ))}
            </dl>
            {u.recentNotes.length > 0 && (
              <div>
                <div className="mb-1.5 flex items-center justify-between text-sm font-semibold">Recent notes <Link href={`/admin/notes?q=${encodeURIComponent(u.email)}`} className="text-xs font-normal text-primary underline" onClick={onClose}>See all</Link></div>
                <ul className="grid gap-1 text-sm">
                  {u.recentNotes.map((n) => <li key={n.id} className="flex justify-between gap-3 rounded-md border px-3 py-1.5"><span className="truncate">{n.title || "Untitled"} <span className="text-muted-foreground">/{n.slug}</span></span>{n.isDisabled ? <Tag tone="bad">disabled</Tag> : n.isDeleted ? <Tag>trash</Tag> : <Tag>{n.privacy}</Tag>}</li>)}
                </ul>
              </div>
            )}
            <div className="flex flex-wrap gap-2 border-t pt-4">
              {u.suspendedAt
                ? <Button size="sm" variant="outline" onClick={() => act({ action: "unsuspend" }, "User unsuspended")}><CircleCheck /> Unsuspend</Button>
                : <Button size="sm" variant="outline" disabled={self || u.role === "admin"} onClick={() => setDlg("suspend")}><Ban /> Suspend</Button>}
              {u.role === "admin"
                ? <Button size="sm" variant="outline" disabled={self} onClick={() => act({ action: "setRole", role: "user" }, "Admin rights removed")}><ShieldOff /> Remove admin</Button>
                : <Button size="sm" variant="outline" onClick={() => act({ action: "setRole", role: "admin" }, "User is now an admin")}><ShieldCheck /> Make admin</Button>}
              {!u.emailVerified && <Button size="sm" variant="outline" onClick={() => act({ action: "verifyEmail" }, "Email marked verified")}><MailCheck /> Mark verified</Button>}
              {!u.emailVerified && <Button size="sm" variant="outline" onClick={() => act({ action: "resendVerification" }, "Verification email sent")}><Send /> Resend verification</Button>}
              <Button size="sm" variant="outline" onClick={() => act({ action: "sendReset" }, "Password reset email sent")}><KeyRound /> Send password reset</Button>
              <Button size="sm" variant="destructive" className="ml-auto" disabled={self || u.role === "admin"} onClick={() => setDlg("delete")}><Trash2 /> Delete user</Button>
            </div>
          </div>
        )}
        <ActionDialog open={dlg === "suspend"} onClose={() => setDlg(null)} title="Suspend this user?" description="They are signed out of every request immediately and can't log in. Their notes stay online." confirmLabel="Suspend" destructive field="Reason (shown to the user when they try to log in)" required
          onConfirm={(reason) => act({ action: "suspend", reason }, "User suspended")} />
        <ActionDialog open={dlg === "delete"} onClose={() => setDlg(null)} title="Delete this user permanently?" description="Their account, every note they own, versions and attachments are erased. This can't be undone." confirmLabel="Delete user" destructive confirmText={u?.email}
          onConfirm={async () => { await api(`/admin/users/${id}`, { method: "DELETE" }); toast.success("User deleted"); onChanged(); onClose(); }} />
      </DialogContent>
    </Dialog>
  );
}

export default function Users() {
  const [f, setF] = useState({ q: "", role: "", status: "", verified: "", sort: "createdAt", order: "desc" });
  const [qInput, setQInput] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const { data, loading, error, reload } = useAdminList("/admin/users", { ...f, page });

  useEffect(() => { const t = setTimeout(() => { setF((x) => ({ ...x, q: qInput })); setPage(1); }, 300); return () => clearTimeout(t); }, [qInput]);
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setPage(1); };

  return (
    <>
      <PageHeader title="Users" subtitle="Search, moderate and manage accounts." />
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-52 flex-1"><Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Search name or email" className="pl-9" aria-label="Search users" /></div>
        <Select value={f.role} onChange={set("role")} className="w-32" aria-label="Role"><option value="">All roles</option><option value="user">Users</option><option value="admin">Admins</option></Select>
        <Select value={f.status} onChange={set("status")} className="w-36" aria-label="Status"><option value="">Any status</option><option value="active">Active</option><option value="suspended">Suspended</option></Select>
        <Select value={f.verified} onChange={set("verified")} className="w-36" aria-label="Email verification"><option value="">Any email</option><option value="yes">Verified</option><option value="no">Unverified</option></Select>
        <Select value={`${f.sort}:${f.order}`} onChange={(e) => { const [sort, order] = e.target.value.split(":"); setF({ ...f, sort, order }); setPage(1); }} className="w-44" aria-label="Sort">
          <option value="createdAt:desc">Newest first</option><option value="createdAt:asc">Oldest first</option><option value="lastLogin:desc">Last login</option><option value="notes:desc">Most notes</option><option value="name:asc">Name A–Z</option><option value="email:asc">Email A–Z</option>
        </Select>
      </div>
      <ListState loading={loading} error={error} onRetry={reload} empty={data && data.items.length === 0 && "No users match these filters."}>
        {data && (
          <>
            <TableWrap>
              <thead><tr><Th>User</Th><Th>Role</Th><Th>Status</Th><Th className="text-right">Notes</Th><Th>Joined</Th><Th>Last login</Th></tr></thead>
              <tbody>
                {data.items.map((u) => (
                  <tr key={u.id} onClick={() => setSelected(u.id)} className="cursor-pointer hover:bg-muted/50">
                    <Td><div className="flex items-center gap-2.5"><Avatar user={u} size={32} /><div className="min-w-0"><button className="block max-w-56 truncate font-medium text-left hover:text-primary" onClick={(e) => { e.stopPropagation(); setSelected(u.id); }}>{u.name}</button><p className="max-w-56 truncate text-xs text-muted-foreground">{u.email}</p></div></div></Td>
                    <Td><Tag tone={u.role === "admin" ? "info" : "muted"}>{u.role}</Tag></Td>
                    <Td><div className="flex gap-1.5">{u.suspendedAt ? <Tag tone="bad">suspended</Tag> : <Tag tone="ok">active</Tag>}{!u.emailVerified && <Tag tone="warn">unverified</Tag>}</div></Td>
                    <Td className="text-right tabular-nums">{u.noteCount}</Td>
                    <Td className="whitespace-nowrap text-muted-foreground">{fmtDay(u.createdAt)}</Td>
                    <Td className="whitespace-nowrap text-muted-foreground">{fmtDay(u.lastLoginAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
            <Pager data={data} page={page} setPage={setPage} />
          </>
        )}
      </ListState>
      <UserDrawer id={selected} onClose={() => setSelected(null)} onChanged={reload} />
    </>
  );
}
