"use client";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAdminList, PageHeader, TableWrap, Th, Td, Tag, Pager, ListState, fmtDate } from "./ui";

export default function AuditLog() {
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  const [targetType, setTargetType] = useState("");
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAdminList("/admin/audit", { q, targetType, page });
  useEffect(() => { const t = setTimeout(() => { setQ(qInput); setPage(1); }, 300); return () => clearTimeout(t); }, [qInput]);

  return (
    <>
      <PageHeader title="Audit log" subtitle="Every admin action, newest first. Entries can't be edited from the panel." />
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-52 flex-1"><Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Search admin, action or details" className="pl-9" aria-label="Search audit log" /></div>
        <Select value={targetType} onChange={(e) => { setTargetType(e.target.value); setPage(1); }} className="w-40" aria-label="Target type">
          <option value="">All targets</option><option value="user">Users</option><option value="note">Notes</option><option value="report">Reports</option><option value="attachment">Attachments</option><option value="settings">Settings</option><option value="system">System</option>
        </Select>
      </div>
      <ListState loading={loading} error={error} onRetry={reload} empty={data && data.items.length === 0 && "No entries match."}>
        {data && (
          <>
            <TableWrap>
              <thead><tr><Th>When</Th><Th>Admin</Th><Th>Action</Th><Th>Details</Th></tr></thead>
              <tbody>
                {data.items.map((e) => (
                  <tr key={e.id}>
                    <Td className="whitespace-nowrap text-muted-foreground">{fmtDate(e.createdAt)}</Td>
                    <Td className="max-w-44 truncate">{e.adminEmail}</Td>
                    <Td><Tag tone={e.action.includes("delete") || e.action.includes("suspend") ? "bad" : "info"}>{e.action}</Tag></Td>
                    <Td className="max-w-md"><code className="break-all text-xs text-muted-foreground">{e.meta ? Object.entries(e.meta).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`).join(" · ") : e.targetId || ""}</code></Td>
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
