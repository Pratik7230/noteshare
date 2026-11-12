"use client";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { useAdminList, PageHeader, StatCard, TableWrap, Th, Td, Pager, ListState, ActionDialog, fmtBytes, fmtDay } from "./ui";

export default function Storage() {
  const [page, setPage] = useState(1);
  const [del, setDel] = useState(null);
  const stats = useAdminList("/admin/stats", {});
  const { data, loading, error, reload } = useAdminList("/admin/attachments", { page });
  const t = stats.data?.totals;

  return (
    <>
      <PageHeader title="Storage" subtitle="Uploaded files, largest first." />
      {t && <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3"><StatCard label="Attachments" value={t.attachments.toLocaleString()} /><StatCard label="Total size" value={fmtBytes(t.storage_bytes)} /><StatCard label="Average size" value={fmtBytes(t.attachments ? Math.round(t.storage_bytes / t.attachments) : 0)} /></div>}
      <ListState loading={loading} error={error} onRetry={reload} empty={data && data.items.length === 0 && "No attachments uploaded yet."}>
        {data && (
          <>
            <TableWrap>
              <thead><tr><Th>File</Th><Th>Note</Th><Th>Type</Th><Th className="text-right">Size</Th><Th>Uploaded</Th><Th className="w-12"><span className="sr-only">Actions</span></Th></tr></thead>
              <tbody>
                {data.items.map((a) => (
                  <tr key={a.id}>
                    <Td className="max-w-56 truncate font-medium">{a.filename}</Td>
                    <Td><Link href={`/admin/notes?q=${encodeURIComponent(a.noteSlug)}`} className="hover:text-primary">/{a.noteSlug}</Link></Td>
                    <Td className="text-muted-foreground">{a.mimeType}</Td>
                    <Td className="text-right tabular-nums">{fmtBytes(a.size)}</Td>
                    <Td className="whitespace-nowrap text-muted-foreground">{fmtDay(a.createdAt)}</Td>
                    <Td><Button variant="ghost" size="icon-sm" aria-label={`Delete ${a.filename}`} onClick={() => setDel(a)}><Trash2 /></Button></Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
            <Pager data={data} page={page} setPage={setPage} />
          </>
        )}
      </ListState>
      <ActionDialog open={!!del} onClose={() => setDel(null)} title="Delete this file?" description={del ? `${del.filename} will be removed from storage. Notes that embed it will show a broken image.` : ""} confirmLabel="Delete" destructive
        onConfirm={async () => { try { await api(`/admin/attachments/${del.id}`, { method: "DELETE" }); toast.success("File deleted"); reload(); stats.reload(); } catch (e) { toast.error(e.message); throw e; } }} />
    </>
  );
}
