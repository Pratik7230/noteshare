"use client";
import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export const fmtBytes = (n = 0) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : n < 1073741824 ? `${(n / 1048576).toFixed(1)} MB` : `${(n / 1073741824).toFixed(2)} GB`);
export const fmtDate = (d) => (d ? new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "–");
export const fmtDay = (d) => (d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" }) : "never");

/** Fetches a list endpoint and refetches when params change. */
export function useAdminList(path, params) {
  const [state, setState] = useState({ data: null, error: "", loading: true });
  const [tick, setTick] = useState(0);
  const key = JSON.stringify(params);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: "" }));
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== "" && v != null && sp.set(k, v));
    api(`${path}?${sp}`).then((data) => alive && setState({ data, error: "", loading: false })).catch((e) => alive && setState({ data: null, error: e.message, loading: false }));
    return () => { alive = false; };
  }, [path, key, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  return { ...state, reload: useCallback(() => setTick((t) => t + 1), []) };
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-bold tracking-tight">{title}</h1>{subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}</div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function StatCard({ label, value, hint, tone }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold tabular-nums", tone === "warn" && "text-amber-500", tone === "bad" && "text-destructive")}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Tag({ children, tone = "muted" }) {
  const tones = {
    muted: "bg-muted text-muted-foreground", ok: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    warn: "bg-amber-500/15 text-amber-600 dark:text-amber-400", bad: "bg-destructive/15 text-destructive", info: "bg-accent text-primary",
  };
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", tones[tone])}>{children}</span>;
}

export function TableWrap({ children }) {
  return <div className="overflow-x-auto rounded-xl border bg-card shadow-sm"><table className="w-full min-w-[640px] text-left text-sm">{children}</table></div>;
}
export const Th = ({ children, className }) => <th className={cn("border-b bg-muted/50 px-3 py-2.5 text-xs font-semibold text-muted-foreground", className)}>{children}</th>;
export const Td = ({ children, className, ...p }) => <td className={cn("border-b px-3 py-2.5 align-middle", className)} {...p}>{children}</td>;

export function ListState({ loading, error, empty, onRetry, children }) {
  if (error) return <div role="alert" className="rounded-xl border border-destructive/40 p-6 text-center text-sm">{error} <button className="text-primary underline cursor-pointer" onClick={onRetry}>Retry</button></div>;
  if (loading) return <div className="grid gap-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;
  if (empty) return <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">{empty}</div>;
  return children;
}

export function Pager({ data, page, setPage }) {
  if (!data) return null;
  const pages = Math.max(1, Math.ceil(data.total / data.limit));
  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>{data.total.toLocaleString()} total</span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
        <span>Page {page} of {pages}</span>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button>
      </div>
    </div>
  );
}

/** Confirmation dialog, optionally asking for a reason / note. */
export function ActionDialog({ open, onClose, title, description, confirmLabel = "Confirm", destructive, field, required, onConfirm, confirmText }) {
  const [value, setValue] = useState("");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setValue(""); setTyped(""); } }, [open]);
  const ok = (!field || !required || value.trim().length >= 3) && (!confirmText || typed === confirmText);
  const submit = async (e) => {
    e.preventDefault();
    if (!ok) return;
    setBusy(true);
    try { await onConfirm(value.trim()); onClose(); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle>{description && <DialogDescription>{description}</DialogDescription>}</DialogHeader>
        <form onSubmit={submit} className="grid gap-3">
          {field && (
            <textarea value={value} onChange={(e) => setValue(e.target.value)} rows={3} maxLength={255} autoFocus aria-label={field}
              placeholder={field} className="w-full resize-none rounded-lg border bg-card px-3 py-2 text-sm" />
          )}
          {confirmText && (
            <div className="grid gap-1.5 text-sm">
              <span>Type <code className="rounded bg-muted px-1">{confirmText}</code> to confirm</span>
              <input value={typed} onChange={(e) => setTyped(e.target.value)} className="h-9 rounded-lg border bg-card px-3 text-sm" aria-label="Confirmation text" />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant={destructive ? "destructive" : "default"} disabled={!ok || busy}>{busy && <Loader2 className="animate-spin" />}{confirmLabel}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Tiny dependency-free bar chart. */
export function BarChart({ data, valueKey, label, color = "var(--primary)" }) {
  const max = Math.max(1, ...data.map((d) => d[valueKey]));
  const total = data.reduce((a, d) => a + d[valueKey], 0);
  const w = 600, h = 120, bw = w / data.length;
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-baseline justify-between"><h3 className="text-sm font-semibold">{label}</h3><span className="text-xs text-muted-foreground">{total} in 30 days</span></div>
      <svg viewBox={`0 0 ${w} ${h + 18}`} className="mt-3 w-full" role="img" aria-label={`${label}, last 30 days`}>
        {data.map((d, i) => {
          const bh = Math.max(d[valueKey] ? 3 : 1, (d[valueKey] / max) * h);
          return (
            <g key={d.day}>
              <rect x={i * bw + 2} y={h - bh} width={bw - 4} height={bh} rx={2} fill={color} opacity={d[valueKey] ? 1 : 0.2}><title>{`${d.day}: ${d[valueKey]}`}</title></rect>
            </g>
          );
        })}
        <text x="0" y={h + 14} fontSize="10" fill="var(--muted-foreground)">{data[0]?.day.slice(5)}</text>
        <text x={w} y={h + 14} fontSize="10" textAnchor="end" fill="var(--muted-foreground)">{data.at(-1)?.day.slice(5)}</text>
      </svg>
    </div>
  );
}
