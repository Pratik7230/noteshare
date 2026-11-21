"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, CircleCheck, Loader2, Lock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/avatar";
import { TicketMessage } from "@/components/support/message";
import { api } from "@/lib/api-client";
import { TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES, TICKET_MESSAGE_MAX } from "@/lib/tickets";
import { Tag, ActionDialog, fmtDate, fmtDay } from "./ui";
import { STATUS_TONE, PRIORITY_TONE } from "./tickets";

const cap = (s) => s[0].toUpperCase() + s.slice(1);

export default function TicketDetail({ id }) {
  const [t, setT] = useState(null);
  const [error, setError] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(""); // "", "reply", "close", "update"
  const [confirmClose, setConfirmClose] = useState(null); // "reply" (send & close) | "status"

  const load = useCallback(() => { setError(""); api(`/admin/tickets/${id}`).then(setT).catch((e) => setError(e.message)); }, [id]);
  useEffect(() => { load(); }, [load]);

  const update = async (body, ok) => {
    setBusy("update");
    try { setT(await api(`/admin/tickets/${id}`, { method: "PATCH", body })); toast.success(ok); }
    catch (e) { toast.error(e.message); } finally { setBusy(""); }
  };

  const send = async (close) => {
    if (!reply.trim()) return;
    setBusy(close ? "close" : "reply");
    try {
      setT(await api(`/admin/tickets/${id}/messages`, { method: "POST", body: { message: reply, close } }));
      setReply("");
      toast.success(close ? "Reply sent and ticket closed" : "Reply sent. The user was emailed.");
    } catch (e) { toast.error(e.message); } finally { setBusy(""); }
  };

  const back = <Link href="/admin/tickets" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="size-4" /> All tickets</Link>;

  if (error) {
    return (
      <div>
        {back}
        <div role="alert" className="mt-4 rounded-xl border border-destructive/40 p-6 text-center text-sm">{error} <button className="cursor-pointer text-primary underline" onClick={load}>Retry</button></div>
      </div>
    );
  }
  if (!t) return <div className="grid gap-3"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-40" /></div>;

  const closed = t.status === "closed";
  return (
    <>
      {back}
      <div className="mt-3 mb-5">
        <h1 className="break-words text-2xl font-bold tracking-tight"><span className="text-muted-foreground">#{t.number}</span> {t.subject}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Tag tone={STATUS_TONE[t.status]}>{t.status}</Tag>
          <Tag tone={PRIORITY_TONE[t.priority]}>{t.priority} priority</Tag>
          <Tag>{TICKET_CATEGORIES[t.category]}</Tag>
          <span>Opened {fmtDate(t.createdAt)}</span>
          {t.closedAt && <span>· closed {fmtDate(t.closedAt)}</span>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="min-w-0">
          <ol className="grid gap-3" aria-label="Conversation">
            {t.messages.map((m) => <TicketMessage key={m.id} m={m} staffTag />)}
          </ol>
          {closed ? (
            <p className="mt-6 flex items-center gap-2 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              <Lock className="size-4 shrink-0" aria-hidden="true" />
              Closed {fmtDate(t.closedAt)}. Closed tickets are read-only and can't be reopened; the user has to open a new ticket.
            </p>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); send(false); }} className="mt-6 grid gap-2 rounded-xl border bg-card p-4 shadow-sm">
              <Label htmlFor="admin-reply">Reply to {t.user.name}</Label>
              <textarea id="admin-reply" value={reply} onChange={(e) => setReply(e.target.value)} rows={5} maxLength={TICKET_MESSAGE_MAX}
                className="w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm" placeholder="The user sees this as a reply from the Support team and gets it by email." />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs tabular-nums text-muted-foreground">{reply.length}/{TICKET_MESSAGE_MAX}</span>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" disabled={!!busy || !reply.trim()} onClick={() => setConfirmClose("reply")}>
                    {busy === "close" ? <Loader2 className="animate-spin" /> : <CircleCheck />} Send & close
                  </Button>
                  <Button type="submit" disabled={!!busy || !reply.trim()}>{busy === "reply" ? <Loader2 className="animate-spin" /> : <Send />} Send reply</Button>
                </div>
              </div>
            </form>
          )}
        </div>

        <aside className="grid h-fit gap-4">
          <section className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="mb-3 text-xs font-semibold text-muted-foreground">Requester</h2>
            <div className="flex items-center gap-3">
              <Avatar user={t.user} size={40} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{t.user.name}</p>
                <p className="truncate text-xs text-muted-foreground">{t.user.email}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Joined {fmtDay(t.user.joinedAt)}</p>
            {t.user.suspended && <div className="mt-2"><Tag tone="bad">suspended</Tag></div>}
          </section>
          <section className="grid gap-3 rounded-xl border bg-card p-4 shadow-sm">
            <div className="grid gap-1.5">
              <Label htmlFor="t-status">Status</Label>
              <Select id="t-status" value={t.status} disabled={!!busy || closed}
                onChange={(e) => (e.target.value === "closed" ? setConfirmClose("status") : update({ status: e.target.value }, `Ticket marked ${e.target.value}`))}>
                {TICKET_STATUSES.map((s) => <option key={s} value={s}>{cap(s)}</option>)}
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="t-priority">Priority</Label>
              <Select id="t-priority" value={t.priority} disabled={!!busy || closed} onChange={(e) => update({ priority: e.target.value }, `Priority set to ${e.target.value}`)}>
                {TICKET_PRIORITIES.map((p) => <option key={p} value={p}>{cap(p)}</option>)}
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">Users don't see priority. Changes are recorded in the audit log.</p>
          </section>
        </aside>
      </div>

      <ActionDialog open={!!confirmClose} onClose={() => setConfirmClose(null)}
        title={confirmClose === "reply" ? "Send reply and close this ticket?" : "Close this ticket?"}
        description="Closing is permanent. Neither you nor the user can reply to it or reopen it; they would have to open a new ticket."
        confirmLabel={confirmClose === "reply" ? "Send & close" : "Close ticket"}
        onConfirm={() => (confirmClose === "reply" ? send(true) : update({ status: "closed" }, "Ticket closed"))} />
    </>
  );
}
