"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TICKET_CATEGORIES, TICKET_PRIORITIES } from "@/lib/tickets";
import { useAdminList, PageHeader, TableWrap, Th, Td, Tag, Pager, ListState, fmtDate } from "./ui";

export const STATUS_TONE = { open: "bad", answered: "info", closed: "muted" };
export const PRIORITY_TONE = { high: "bad", normal: "muted", low: "muted" };
const TABS = [["open", "Open"], ["answered", "Answered"], ["closed", "Closed"], ["", "All"]];

export default function Tickets() {
  const [status, setStatus] = useState("open");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAdminList("/admin/tickets", { status, priority, category, q, page });

  useEffect(() => { const t = setTimeout(() => { setQ(qInput); setPage(1); }, 300); return () => clearTimeout(t); }, [qInput]);

  const filtered = !!(q || priority || category);
  return (
    <>
      <PageHeader title="Tickets" subtitle={status === "open" ? "Waiting on a reply from us. Urgent and longest-waiting first." : "Support requests from users."} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Ticket status" className="flex gap-1 rounded-lg border bg-card p-1">
          {TABS.map(([v, l]) => (
            <button key={l} role="tab" aria-selected={status === v} onClick={() => { setStatus(v); setPage(1); }}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-sm ${status === v ? "bg-accent font-medium text-primary" : "text-muted-foreground"}`}>
              {l}{v && data?.counts?.[v] > 0 && <span className="ml-1.5 text-xs tabular-nums opacity-70">{data.counts[v]}</span>}
            </button>
          ))}
        </div>
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Search subject, user or #number" className="pl-9" aria-label="Search tickets" />
        </div>
        <Select value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }} className="w-36" aria-label="Priority">
          <option value="">Any priority</option>
          {TICKET_PRIORITIES.map((p) => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
        </Select>
        <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className="w-44" aria-label="Category">
          <option value="">Any category</option>
          {Object.entries(TICKET_CATEGORIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </div>
      <ListState loading={loading} error={error} onRetry={reload}
        empty={data && data.items.length === 0 && (status === "open" && !filtered ? "No tickets waiting on us. Inbox zero." : "No tickets match.")}>
        {data && (
          <>
            <TableWrap>
              <thead><tr><Th>Ticket</Th><Th>User</Th><Th>Category</Th><Th>Priority</Th><Th>Status</Th><Th>Last activity</Th></tr></thead>
              <tbody>
                {data.items.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/40">
                    <Td>
                      <Link href={`/admin/tickets/${t.id}`} className="block max-w-md truncate font-medium hover:text-primary"><span className="text-muted-foreground">#{t.number}</span> {t.subject}</Link>
                      {t.preview && <p className="mt-0.5 max-w-md truncate text-xs text-muted-foreground">{t.preview}</p>}
                    </Td>
                    <Td><p className="max-w-48 truncate">{t.user.name}</p><p className="max-w-48 truncate text-xs text-muted-foreground">{t.user.email}</p></Td>
                    <Td className="whitespace-nowrap">{TICKET_CATEGORIES[t.category]}</Td>
                    <Td><Tag tone={PRIORITY_TONE[t.priority]}>{t.priority}</Tag></Td>
                    <Td><Tag tone={STATUS_TONE[t.status]}>{t.status}</Tag></Td>
                    <Td className="whitespace-nowrap text-xs text-muted-foreground">{fmtDate(t.lastMessageAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
            <Pager data={data} page={page} setPage={setPage} />
          </>
        )}
      </ListState>
    </>
  );
}
