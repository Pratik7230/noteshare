"use client";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminList, PageHeader, StatCard, BarChart, fmtBytes, ListState } from "./ui";

export default function Overview() {
  const { data, loading, error, reload } = useAdminList("/admin/stats", {});
  const t = data?.totals;
  return (
    <>
      <PageHeader title="Overview" subtitle="Activity across the whole site." />
      <ListState loading={loading} error={error} onRetry={reload}>
        {data && (
          <div className="grid gap-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Users" value={t.total_users.toLocaleString()} hint={`${t.new_users_7d} new this week`} />
              <StatCard label="Notes" value={t.total_notes.toLocaleString()} hint={`${t.new_notes_7d} new this week`} />
              <StatCard label="Total views" value={t.total_views.toLocaleString()} />
              <StatCard label="Storage used" value={fmtBytes(t.storage_bytes)} hint={`${t.attachments} ${t.attachments === 1 ? "attachment" : "attachments"}`} />
              <StatCard label="Open reports" value={t.open_reports} tone={t.open_reports ? "bad" : undefined} hint={t.open_reports ? "Needs review" : "All clear"} />
              <StatCard label="Suspended users" value={t.suspended_users} tone={t.suspended_users ? "warn" : undefined} />
              <StatCard label="Disabled notes" value={t.disabled_notes} tone={t.disabled_notes ? "warn" : undefined} />
              <StatCard label="Admins" value={t.admins} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <BarChart data={data.series} valueKey="users" label="New users per day" />
              <BarChart data={data.series} valueKey="notes" label="New notes per day" color="#8b5cf6" />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-xl border bg-card p-4 shadow-sm">
                <h2 className="text-sm font-semibold">Notes breakdown</h2>
                <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  {[["Anonymous", t.anonymous_notes], ["Public", t.public_notes], ["Private", t.private_notes], ["Password protected", t.protected_notes], ["With expiry", t.expiring_notes], ["In trash", t.trashed_notes]].map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b py-1.5"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium tabular-nums">{v.toLocaleString()}</dd></div>
                  ))}
                  <div className="flex justify-between py-1.5"><dt className="text-muted-foreground">Verified users</dt><dd className="font-medium tabular-nums">{t.verified_users} / {t.total_users}</dd></div>
                </dl>
              </section>
              <section className="rounded-xl border bg-card p-4 shadow-sm">
                <h2 className="text-sm font-semibold">Most viewed notes</h2>
                {data.topNotes.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No views yet.</p> : (
                  <ol className="mt-3 grid gap-1.5 text-sm">
                    {data.topNotes.map((n) => (
                      <li key={n.id} className="flex items-center justify-between gap-3 border-b py-1.5 last:border-0">
                        <Link href={`/admin/notes?q=${encodeURIComponent(n.slug)}`} className="truncate hover:text-primary">{n.title || "Untitled"} <span className="text-muted-foreground">/{n.slug}</span></Link>
                        <span className="tabular-nums text-muted-foreground">{n.views.toLocaleString()} {n.views === 1 ? "view" : "views"}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>
          </div>
        )}
      </ListState>
    </>
  );
}
