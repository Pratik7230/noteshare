"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LifeBuoy, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAdminList, PageHeader, Tag, Pager, ListState, fmtDate } from "@/components/admin/ui";
import { api } from "@/lib/api-client";
import { TICKET_CATEGORIES, TICKET_SUBJECT_MAX, TICKET_MESSAGE_MAX } from "@/lib/tickets";

/** Status as the ticket's owner sees it: [label, tone]. */
export const USER_STATUS = { open: ["Awaiting support", "info"], answered: ["Support replied", "ok"], closed: ["Closed", "muted"] };

const TABS = [["active", "Active"], ["closed", "Closed"], ["", "All"]];
const BLANK = { subject: "", category: "account", message: "" };

function NewTicketDialog({ open, onOpenChange }) {
  const router = useRouter();
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const t = await api("/tickets", { method: "POST", body: form });
      toast.success(`Ticket #${t.number} opened. We'll reply here and by email.`);
      setForm(BLANK);
      onOpenChange(false);
      router.push(`/support/${t.id}`);
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New support ticket</DialogTitle>
          <DialogDescription>Tell us what's going on. The more detail you give, the faster we can help.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="t-subject">Subject</Label>
            <Input id="t-subject" value={form.subject} onChange={set("subject")} required minLength={5} maxLength={TICKET_SUBJECT_MAX} placeholder="e.g. I can't change my email address" autoFocus />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="t-category">Category</Label>
            <Select id="t-category" value={form.category} onChange={set("category")}>
              {Object.entries(TICKET_CATEGORIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="t-message">Message</Label>
            <textarea id="t-message" value={form.message} onChange={set("message")} required minLength={10} maxLength={TICKET_MESSAGE_MAX} rows={6}
              placeholder="What happened, what you expected, and any note links or error messages."
              className="w-full resize-y rounded-lg border bg-card px-3 py-2 text-sm" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />}Open ticket</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function SupportTickets() {
  const [status, setStatus] = useState("active");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const { data, loading, error, reload } = useAdminList("/tickets", { status, page });

  // "/support?new=1" (linked from a closed ticket) opens the new-ticket form straight away.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("new")) {
      setCreating(true);
      window.history.replaceState(null, "", "/support");
    }
  }, []);

  const empty = data && data.items.length === 0 && (
    status === "active" ? (
      <div className="grid justify-items-center gap-3">
        <LifeBuoy className="size-8" aria-hidden="true" />
        <p>No open tickets. If something isn't working, we're here to help.</p>
        <Button size="sm" onClick={() => setCreating(true)}><Plus /> New ticket</Button>
      </div>
    ) : "Nothing here."
  );

  return (
    <>
      <PageHeader title="Support" subtitle="Questions, bugs or account trouble? Open a ticket and we'll reply here and by email.">
        <Button onClick={() => setCreating(true)}><Plus /> New ticket</Button>
      </PageHeader>
      <div role="tablist" aria-label="Ticket status" className="mb-4 flex w-fit gap-1 rounded-lg border bg-card p-1">
        {TABS.map(([v, l]) => (
          <button key={l} role="tab" aria-selected={status === v} onClick={() => { setStatus(v); setPage(1); }}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-sm ${status === v ? "bg-accent font-medium text-primary" : "text-muted-foreground"}`}>{l}</button>
        ))}
      </div>
      <ListState loading={loading} error={error} onRetry={reload} empty={empty}>
        {data && (
          <>
            <ul className="grid gap-2">
              {data.items.map((t) => {
                const [label, tone] = USER_STATUS[t.status];
                return (
                  <li key={t.id}>
                    <Link href={`/support/${t.id}`} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/50">
                      <div className="min-w-0">
                        <p className="truncate font-medium"><span className="text-muted-foreground">#{t.number}</span> {t.subject}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {TICKET_CATEGORIES[t.category]} · {t.messageCount} {t.messageCount === 1 ? "message" : "messages"} · updated {fmtDate(t.lastMessageAt)}
                        </p>
                      </div>
                      <Tag tone={tone}>{label}</Tag>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Pager data={data} page={page} setPage={setPage} />
          </>
        )}
      </ListState>
      <NewTicketDialog open={creating} onOpenChange={setCreating} />
    </>
  );
}
