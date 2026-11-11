"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, Clock, FileText, LayoutGrid, List, LogOut, MailWarning, UserRound, Plus, Search, Share2, Star, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/avatar";
import { NoteCard } from "./note-card";
import { useAuth } from "@/hooks/useAuth";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { api, createNote } from "@/lib/api-client";
import { TEMPLATES } from "@/lib/templates";

const VIEWS = [
  { id: "mine", label: "My notes", icon: FileText },
  { id: "recent", label: "Recent", icon: Clock },
  { id: "starred", label: "Starred", icon: Star },
  { id: "shared", label: "Shared with me", icon: Users },
  { id: "archived", label: "Archived", icon: Archive },
  { id: "trash", label: "Trash", icon: Trash2 },
];
const EMPTY = {
  mine: ["No notes yet", "Create your first note to get started."], recent: ["Nothing recent", "Notes you edit will show up here."],
  starred: ["No starred notes", "Star a note to pin it here for quick access."], shared: ["Nothing shared with you", "Notes people invite you to appear here."],
  archived: ["No archived notes", "Archive notes you want out of the way."], trash: ["Trash is empty", "Deleted notes stay here for 30 days."],
};

export default function Dashboard() {
  const router = useRouter();
  const { user, loading, logout, refresh } = useAuth();
  const [view, setView] = useState("mine");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [privacy, setPrivacy] = useState("");
  const [tag, setTag] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("updatedAt");
  const [order, setOrder] = useState("desc");
  const [layout, setLayout] = useState("grid");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [tags, setTags] = useState([]);
  const [tick, setTick] = useState(0);

  const search = useDebouncedCallback((v) => { setQuery(v); setPage(1); }, 300);

  useEffect(() => { if (!loading && !user) router.replace("/login?next=/dashboard"); }, [loading, user, router]);
  useEffect(() => { try { setLayout(localStorage.getItem("dash-layout") || "grid"); } catch {} }, []);
  useEffect(() => { if (user) api("/tags").then((r) => setTags(r.tags)).catch(() => {}); }, [user, tick]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    setData(null); setError("");
    const p = new URLSearchParams({ view: view === "recent" ? "mine" : view, page, limit: view === "recent" ? 10 : 18, sort: view === "recent" ? "updatedAt" : sort, order: view === "recent" ? "desc" : order });
    if (query) p.set("q", query); if (privacy) p.set("privacy", privacy); if (tag) p.set("tag", tag);
    if (from) p.set("from", new Date(from).toISOString()); if (to) p.set("to", new Date(to + "T23:59:59").toISOString());
    api(`/notes?${p}`).then((r) => alive && setData(r)).catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [user, view, query, privacy, tag, from, to, sort, order, page, tick]);

  const reload = () => setTick((t) => t + 1);
  const newNote = async (template) => {
    try { const { slug } = await createNote(template ? { template } : {}); router.push(`/n/${slug}`); }
    catch (e) { toast.error(e.message); }
  };

  const onAction = async (action, n) => {
    try {
      if (action === "open") return router.push(`/n/${n.slug}`);
      if (action === "copy") { await navigator.clipboard.writeText(`${location.origin}/n/${n.slug}`); return toast.success("Link copied"); }
      if (action === "star") { const r = await api(`/notes/${n.id}/star`, { method: "POST" }); toast.success(r.starred ? "Starred" : "Unstarred"); }
      if (action === "duplicate") { const r = await api(`/notes/${n.id}/duplicate`, { method: "POST" }); toast.success("Duplicated"); if (r.slug) router.push(`/n/${r.slug}`); return; }
      if (action === "archive") { const r = await api(`/notes/${n.id}/archive`, { method: "POST", body: {} }); toast.success(r.isArchived ? "Archived" : "Unarchived"); }
      if (action === "trash") { await api(`/notes/${n.id}`, { method: "DELETE" }); toast.success("Moved to trash"); }
      if (action === "restore") { await api(`/notes/${n.id}/restore`, { method: "POST" }); toast.success("Restored"); }
      if (action === "purge") { if (!confirm("Delete this note forever? This can't be undone.")) return; await api(`/notes/${n.id}?permanent=1`, { method: "DELETE" }); toast.success("Deleted"); }
      reload();
    } catch (e) { toast.error(e.message); }
  };

  const setLayoutPersist = (l) => { setLayout(l); try { localStorage.setItem("dash-layout", l); } catch {} };
  const resendVerification = () => api("/auth/resend-verification", { method: "POST" }).then(() => toast.success("Verification email sent")).catch((e) => toast.error(e.message));

  if (loading || !user) return <div className="p-6"><Skeleton className="h-8 w-48" /><Skeleton className="mt-6 h-40 w-full" /></div>;

  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const [emptyTitle, emptyText] = EMPTY[view];
  const filtered = !!(query || privacy || tag || from || to);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-4">
          <Logo href="/dashboard" />
          <div className="flex items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button size="sm"><Plus /> New note</Button></DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => newNote()}><FileText /> Blank note</DropdownMenuItem>
                <DropdownMenuSeparator /><DropdownMenuLabel>From a template</DropdownMenuLabel>
                {Object.entries(TEMPLATES).filter(([k]) => k !== "blank").map(([k, t]) => <DropdownMenuItem key={k} onSelect={() => newNote(k)}>{t.name}</DropdownMenuItem>)}
              </DropdownMenuContent>
            </DropdownMenu>
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Account menu" className="rounded-full p-0"><Avatar user={user} size={36} /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => router.push("/account")}><UserRound /> Account settings</DropdownMenuItem>
                <DropdownMenuItem onSelect={async () => { await logout(); router.push("/"); }}><LogOut /> Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {!user.emailVerified && (
        <div className="border-b bg-accent px-4 py-2 text-sm">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2"><MailWarning className="size-4 text-primary" /> Please verify your email address.
            <button onClick={resendVerification} className="font-medium text-primary underline cursor-pointer">Resend verification email</button>
            <button onClick={refresh} className="text-muted-foreground underline cursor-pointer">I've verified</button></div>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 md:flex-row">
        <nav aria-label="Note views" className="flex shrink-0 gap-1 overflow-x-auto md:w-52 md:flex-col">
          {VIEWS.map((v) => (
            <button key={v.id} onClick={() => { setView(v.id); setPage(1); }} aria-current={view === v.id ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium cursor-pointer hover:bg-muted ${view === v.id ? "bg-accent text-primary" : "text-muted-foreground"}`}>
              <v.icon className="size-4" /> {v.label}
            </button>
          ))}
        </nav>

        <main className="min-w-0 flex-1">
          <h1 className="sr-only">{VIEWS.find((v) => v.id === view).label}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-52 flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => { setQ(e.target.value); search.call(e.target.value); }} placeholder="Search titles and content" className="pl-9" aria-label="Search notes" />
            </div>
            <Select value={privacy} onChange={(e) => { setPrivacy(e.target.value); setPage(1); }} className="w-32" aria-label="Filter by privacy">
              <option value="">All privacy</option><option value="public">Public</option><option value="unlisted">Unlisted</option><option value="private">Private</option>
            </Select>
            {tags.length > 0 && (
              <Select value={tag} onChange={(e) => { setTag(e.target.value); setPage(1); }} className="w-32" aria-label="Filter by tag">
                <option value="">All tags</option>{tags.map((t) => <option key={t} value={t}>#{t}</option>)}
              </Select>
            )}
            <Select value={`${sort}:${order}`} onChange={(e) => { const [s, o] = e.target.value.split(":"); setSort(s); setOrder(o); setPage(1); }} className="w-44" aria-label="Sort notes" disabled={view === "recent"}>
              <option value="updatedAt:desc">Last updated</option><option value="createdAt:desc">Newest created</option><option value="createdAt:asc">Oldest created</option>
              <option value="title:asc">Title A–Z</option><option value="title:desc">Title Z–A</option>
            </Select>
            <div role="group" aria-label="Layout" className="flex rounded-lg border bg-card p-0.5">
              <Button variant={layout === "grid" ? "secondary" : "ghost"} size="icon-sm" onClick={() => setLayoutPersist("grid")} aria-label="Grid view" aria-pressed={layout === "grid"}><LayoutGrid /></Button>
              <Button variant={layout === "list" ? "secondary" : "ghost"} size="icon-sm" onClick={() => setLayoutPersist("list")} aria-label="List view" aria-pressed={layout === "list"}><List /></Button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <label className="flex items-center gap-1.5">Created from <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="h-8 w-36" /></label>
            <label className="flex items-center gap-1.5">to <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="h-8 w-36" /></label>
            {filtered && <button className="text-primary underline cursor-pointer" onClick={() => { setQ(""); setQuery(""); setPrivacy(""); setTag(""); setFrom(""); setTo(""); setPage(1); }}>Clear filters</button>}
          </div>

          <div className="mt-5">
            {error ? (
              <div role="alert" className="rounded-xl border border-destructive/40 p-6 text-center text-sm">{error} <button onClick={reload} className="text-primary underline cursor-pointer">Try again</button></div>
            ) : !data ? (
              <div className={layout === "grid" ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3" : "grid gap-3"}>
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
              </div>
            ) : data.items.length === 0 ? (
              <div className="rounded-xl border border-dashed p-12 text-center">
                <FileText className="mx-auto size-8 text-muted-foreground" />
                <h2 className="mt-3 font-semibold">{filtered ? "No notes match your filters" : emptyTitle}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{filtered ? "Try a different search or clear the filters." : emptyText}</p>
                {view === "mine" && !filtered && <Button className="mt-4" onClick={() => newNote()}><Plus /> New note</Button>}
              </div>
            ) : (
              <>
                <div className={layout === "grid" ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3" : "grid gap-2"}>
                  {data.items.map((n) => <NoteCard key={n.id} note={n} view={view} layout={layout} onAction={onAction} />)}
                </div>
                {pages > 1 && (
                  <div className="mt-6 flex items-center justify-center gap-3 text-sm">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                    <span className="text-muted-foreground">Page {page} of {pages}</span>
                    <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
