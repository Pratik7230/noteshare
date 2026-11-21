"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, CircleCheck, Loader2, Lock, Plus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tag, ActionDialog, fmtDate } from "@/components/admin/ui";
import { api } from "@/lib/api-client";
import { TICKET_CATEGORIES, TICKET_MESSAGE_MAX } from "@/lib/tickets";
import { TicketMessage } from "./message";
import { USER_STATUS } from "./tickets";

export default function TicketThread({ id }) {
  const [t, setT] = useState(null);
  const [error, setError] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [closing, setClosing] = useState(false);

  const load = useCallback(() => { setError(""); api(`/tickets/${id}`).then(setT).catch((e) => setError(e.message)); }, [id]);
  useEffect(() => { load(); }, [load]);

  const send = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setBusy(true);
    try {
      setT(await api(`/tickets/${id}/messages`, { method: "POST", body: { message: reply } }));
      setReply("");
      toast.success("Reply sent");
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  const close = async () => {
    try { setT(await api(`/tickets/${id}`, { method: "PATCH", body: { action: "close" } })); toast.success("Ticket closed"); }
    catch (err) { toast.error(err.message); throw err; }
  };

  const back = <Link href="/support" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="size-4" /> All tickets</Link>;

  if (error) {
    return (
      <div>
        {back}
        <div role="alert" className="mt-4 rounded-xl border border-destructive/40 p-6 text-center text-sm">{error} <button className="cursor-pointer text-primary underline" onClick={load}>Retry</button></div>
      </div>
    );
  }
  if (!t) return <div className="grid gap-3"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>;

  const [label, tone] = USER_STATUS[t.status];
  return (
    <>
      {back}
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-bold tracking-tight"><span className="text-muted-foreground">#{t.number}</span> {t.subject}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Tag tone={tone}>{label}</Tag>
            <Tag>{TICKET_CATEGORIES[t.category]}</Tag>
            <span>Opened {fmtDate(t.createdAt)}</span>
          </div>
        </div>
        {t.status !== "closed" && <Button variant="outline" size="sm" onClick={() => setClosing(true)}><CircleCheck /> Close ticket</Button>}
      </div>

      <ol className="mt-6 grid gap-3" aria-label="Conversation">
        {t.messages.map((m) => <TicketMessage key={m.id} m={m} />)}
      </ol>

      {t.status === "closed" ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed p-4 text-sm">
          <p className="flex items-center gap-2 text-muted-foreground">
            <Lock className="size-4 shrink-0" aria-hidden="true" />
            This ticket was closed {fmtDate(t.closedAt)} and can't be reopened.
          </p>
          <Button asChild size="sm"><Link href="/support?new=1"><Plus /> Open a new ticket</Link></Button>
        </div>
      ) : (
        <form onSubmit={send} className="mt-6 grid gap-2 rounded-xl border bg-card p-4 shadow-sm">
          <Label htmlFor="reply">Add a reply</Label>
          <textarea id="reply" value={reply} onChange={(e) => setReply(e.target.value)} rows={4} maxLength={TICKET_MESSAGE_MAX}
            className="w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm" placeholder="Write your message" />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs tabular-nums text-muted-foreground">{reply.length}/{TICKET_MESSAGE_MAX}</span>
            <Button type="submit" disabled={busy || !reply.trim()}>{busy ? <Loader2 className="animate-spin" /> : <Send />} Send reply</Button>
          </div>
        </form>
      )}

      <ActionDialog open={closing} onClose={() => setClosing(false)} title="Close this ticket?"
        description="Only close it once your problem is solved. Closed tickets can't be reopened; if you need help again you'll have to open a new ticket."
        confirmLabel="Close ticket" onConfirm={close} />
    </>
  );
}
