"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { TableKit } from "@tiptap/extension-table";
import { TaskList, TaskItem } from "@tiptap/extension-list";
import { createLowlight, common } from "lowlight";
import TurndownService from "turndown";
import { toast } from "sonner";
import {
  AlertTriangle, Archive, Check, Clock, Copy, Download, FileUp, History, Loader2, Lock, Maximize2, Minimize2,
  MoreHorizontal, Paperclip, Search, Settings2, Share2, Star, Trash2, Keyboard, Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";
import { useAuth } from "@/hooks/useAuth";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { api, ApiClientError, downloadExport, editKeys } from "@/lib/api-client";
import { timeAgo } from "@/lib/utils";
import { Toolbar } from "./toolbar";
import { FindReplace } from "./find-replace";
import { ShareDialog } from "./share-dialog";
import { SettingsDialog } from "./settings-dialog";
import { VersionsDialog } from "./versions-dialog";
import { SearchHighlight } from "./search-extension";
import { Rendered, markdownToHtml, plainToHtml, sanitizeHtml } from "./rendered";

const lowlight = createLowlight(common);
const turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
const MODES = { rich: "Rich text", markdown: "Markdown", plain: "Plain text" };
const countWords = (t) => (t.trim() ? t.trim().split(/\s+/).length : 0);

const SHORTCUTS = [
  ["Save now", "Ctrl/⌘ + S"], ["Find and replace", "Ctrl/⌘ + H"], ["Full screen", "Ctrl/⌘ + Shift + F"], ["Insert link", "Ctrl/⌘ + K"],
  ["Bold / Italic / Underline", "Ctrl/⌘ + B / I / U"], ["Undo / Redo", "Ctrl/⌘ + Z / Y"], ["Shortcuts", "Ctrl/⌘ + /"],
];

function StatusScreen({ icon: Icon, title, text, children }) {
  return (
    <main className="grid min-h-dvh place-items-center p-6 text-center">
      <div className="max-w-sm">
        <Icon className="mx-auto size-10 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-bold">{title}</h1>
        <p className="mt-2 text-muted-foreground">{text}</p>
        <div className="mt-6 flex justify-center gap-2">{children}</div>
      </div>
    </main>
  );
}

function PasswordGate({ slug, onUnlocked }) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try { await api(`/notes/${slug}/verify-password`, { method: "POST", body: { password: pw } }); onUnlocked(); }
    catch (err) { setError(err.message); setBusy(false); }
  };
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm">
        <Lock className="size-6 text-primary" />
        <h1 className="mt-3 text-xl font-semibold">This note is password protected</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enter the password to open it.</p>
        <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} className="mt-4" placeholder="Password" autoFocus required aria-label="Note password" />
        {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
        <Button type="submit" className="mt-4 w-full" disabled={busy}>{busy && <Loader2 className="animate-spin" />}Unlock</Button>
      </form>
    </main>
  );
}

export default function NoteEditor({ slug: initialSlug }) {
  const router = useRouter();
  const { user } = useAuth();
  const [slug, setSlug] = useState(initialSlug);
  const [phase, setPhase] = useState({ name: "loading" }); // loading | ready | locked | error
  const [note, setNote] = useState(null);
  const [loaded, setLoaded] = useState(null);
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState("rich");
  const [text, setText] = useState("");
  const [richText, setRichText] = useState("");
  const [mdView, setMdView] = useState("split");
  const [saveState, setSaveState] = useState("saved"); // saved | saving | dirty | error
  const [updatedAt, setUpdatedAt] = useState(null);
  const [, setNow] = useState(0);
  const [dlg, setDlg] = useState(null); // share | settings | versions | delete | shortcuts
  const [findOpen, setFindOpen] = useState(false);
  const [zen, setZen] = useState(false);

  const refs = useRef({});
  const suppress = useRef(false);
  const rev = useRef(0);
  const textareaRef = useRef(null);
  const fileRef = useRef(null);
  const importRef = useRef(null);
  const attachRef = useRef(null);
  const attachKind = useRef("any");

  const canEdit = !!note?.access?.canEdit;
  Object.assign(refs.current, { title, mode, text, note, slug, canEdit });

  // ---------- load ----------
  const load = useCallback(async () => {
    try {
      const m = /[#&]key=([\w-]+)/.exec(location.hash);
      if (m) { editKeys.set(initialSlug, m[1]); history.replaceState(null, "", location.pathname); }
      const data = await api(`/notes/${refs.current.slug}`, { slug: refs.current.slug });
      if (data.redirectTo) {
        const k = editKeys.get(refs.current.slug); if (k) editKeys.set(data.redirectTo, k);
        refs.current.slug = data.redirectTo; setSlug(data.redirectTo);
        history.replaceState(null, "", `/n/${data.redirectTo}`);
        return load();
      }
      if (data.locked) { setPhase({ name: "locked" }); return; }
      setLoaded(data);
      setPhase({ name: "ready" });
    } catch (e) {
      setPhase({ name: "error", status: e.status, message: e.message });
    }
  }, [initialSlug]);
  useEffect(() => { load(); }, [load]);

  // ---------- editor ----------
  const touchRef = useRef(() => {});
  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    content: "",
    extensions: [
      StarterKit.configure({ codeBlock: false, link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" } } }),
      CodeBlockLowlight.configure({ lowlight }),
      Image, TableKit.configure({ table: { resizable: true } }), TaskList, TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: "Start writing…" }),
      SearchHighlight,
    ],
    editorProps: {
      attributes: { class: "prose-note", "aria-label": "Note content", spellcheck: "true" },
      handlePaste: (_v, e) => {
        const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith("image/"));
        if (f) { e.preventDefault(); refs.current.upload?.(f, true); return true; }
        return false;
      },
      handleDrop: (_v, e) => {
        const f = [...(e.dataTransfer?.files || [])].find((x) => x.type.startsWith("image/"));
        if (f) { e.preventDefault(); refs.current.upload?.(f, true); return true; }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (suppress.current) return;
      setRichText(ed.getText());
      touchRef.current();
    },
  });

  // apply loaded note into editor/state
  useEffect(() => {
    if (!loaded || !editor) return;
    setNote(loaded); setTitle(loaded.title); setMode(loaded.contentType); setUpdatedAt(loaded.updatedAt); setSaveState("saved");
    if (loaded.contentType === "rich") {
      suppress.current = true;
      editor.commands.setContent(loaded.content, { emitUpdate: false });
      suppress.current = false;
      setRichText(editor.getText());
    } else setText(loaded.content);
  }, [loaded, editor]);

  useEffect(() => { editor?.setEditable(canEdit && mode === "rich"); }, [editor, canEdit, mode]);
  useEffect(() => { document.title = `${title || "Untitled"} | NoteShare`; }, [title]);
  useEffect(() => { const t = setInterval(() => setNow((n) => n + 1), 30000); return () => clearInterval(t); }, []);

  // ---------- autosave ----------
  const getContent = () => (refs.current.mode === "rich" ? editor.getHTML() : refs.current.text);
  const save = useCallback(async () => {
    const r = refs.current;
    if (!r.note || !r.canEdit || !editor) return;
    const my = rev.current;
    setSaveState("saving");
    try {
      const res = await api(`/notes/${r.note.id}`, { method: "PATCH", slug: r.slug, body: { title: r.title, content: getContent(), contentType: r.mode } });
      setUpdatedAt(res.updatedAt);
      setSaveState(rev.current === my ? "saved" : "dirty");
    } catch (e) {
      setSaveState("error");
      if (e.status === 403) toast.error("This note is read-only for you.");
    }
  }, [editor]); // eslint-disable-line react-hooks/exhaustive-deps
  const saver = useDebouncedCallback(save, 900);
  const touch = useCallback(() => { rev.current++; setSaveState("dirty"); saver.call(); }, [saver]);
  touchRef.current = touch;

  useEffect(() => {
    const onHide = () => { if (document.visibilityState === "hidden") saver.flush(); };
    const onUnload = (e) => { if (["dirty", "error"].includes(refs.current.saveState)) { e.preventDefault(); e.returnValue = ""; } };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onUnload);
    return () => { document.removeEventListener("visibilitychange", onHide); window.removeEventListener("beforeunload", onUnload); };
  }, [saver]);
  refs.current.saveState = saveState;

  // ---------- mode switching ----------
  const switchMode = (next) => {
    if (next === mode || !editor) return;
    if (mode === "rich") {
      setText(next === "markdown" ? turndown.turndown(editor.getHTML()) : editor.getText({ blockSeparator: "\n\n" }));
    } else if (next === "rich") {
      suppress.current = true;
      editor.commands.setContent(mode === "markdown" ? markdownToHtml(text) : plainToHtml(text), { emitUpdate: false });
      suppress.current = false;
      setRichText(editor.getText());
    }
    setMode(next); refs.current.mode = next; setFindOpen(false); touch();
  };

  // ---------- attachments / images ----------
  const upload = useCallback(async (file, imageOnly = false) => {
    const r = refs.current;
    if (!r.note || !r.canEdit) return;
    const id = toast.loading(`Uploading ${file.name}…`);
    try {
      const fd = new FormData(); fd.append("file", file);
      const a = await api(`/notes/${r.note.id}/attachments`, { method: "POST", slug: r.slug, body: fd });
      const isImg = a.mimeType.startsWith("image/");
      if (r.mode === "rich") {
        const c = editor.chain().focus();
        (isImg ? c.setImage({ src: a.url, alt: a.filename }) : c.insertContent({ type: "text", text: a.filename, marks: [{ type: "link", attrs: { href: a.url } }] })).run();
      } else {
        const md = isImg ? `![${a.filename}](${a.url})` : `[${a.filename}](${a.url})`;
        const ta = textareaRef.current, pos = ta ? ta.selectionStart : r.text.length;
        setText(r.text.slice(0, pos) + md + r.text.slice(pos)); touch();
      }
      toast.success("Uploaded", { id });
    } catch (e) { toast.error(e.message, { id }); }
  }, [editor, touch]);
  refs.current.upload = upload;

  const pickFile = (kind) => { attachKind.current = kind; if (fileRef.current) { fileRef.current.accept = kind === "image" ? "image/png,image/jpeg,image/gif,image/webp" : "image/png,image/jpeg,image/gif,image/webp,application/pdf,text/plain"; fileRef.current.click(); } };

  // ---------- import ----------
  const importFile = async (file) => {
    if (!file) return;
    if (file.size > 1_000_000) return toast.error("File is too large to import (max 1 MB)");
    const raw = await file.text();
    const ext = file.name.split(".").pop().toLowerCase();
    let html = null, plain = raw;
    if (ext === "html" || ext === "htm") { html = sanitizeHtml(raw); plain = turndown.turndown(html); }
    else if (ext === "md" || ext === "markdown") { html = markdownToHtml(raw); }
    else html = plainToHtml(raw);
    if (mode === "rich") { editor.commands.setContent(html, { emitUpdate: true }); }
    else { setText(plain); touch(); }
    if (!title) { setTitle(file.name.replace(/\.[^.]+$/, "")); touch(); }
    toast.success(`Imported ${file.name}`);
  };

  // ---------- actions ----------
  const patchNote = (p) => setNote((n) => ({ ...n, ...p }));
  const addLink = () => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href || "";
    const url = window.prompt("Link address (https://…)", prev);
    if (url === null) return;
    if (url === "") return editor.chain().focus().extendMarkRange("link").unsetLink().run();
    const href = /^(https?:|mailto:|tel:)/i.test(url) ? url : `https://${url}`;
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  };
  const withToast = async (fn, ok) => { try { const r = await fn(); if (ok) toast.success(typeof ok === "function" ? ok(r) : ok); return r; } catch (e) { toast.error(e.message); } };

  const duplicate = () => withToast(async () => {
    await saver.flush();
    const r = await api(`/notes/${note.id}/duplicate`, { method: "POST", slug });
    if (r.editKey) editKeys.set(r.slug, r.editKey);
    window.location.assign(`/n/${r.slug}`);
  });
  const star = () => withToast(async () => { const r = await api(`/notes/${note.id}/star`, { method: "POST", slug }); patchNote({ starred: r.starred }); return r; }, (r) => (r.starred ? "Starred" : "Unstarred"));
  const archive = () => withToast(async () => { const r = await api(`/notes/${note.id}/archive`, { method: "POST", slug, body: {} }); patchNote({ isArchived: r.isArchived }); return r; }, (r) => (r.isArchived ? "Archived" : "Unarchived"));
  const remove = () => withToast(async () => {
    const r = await api(`/notes/${note.id}`, { method: "DELETE", slug });
    editKeys.remove(slug);
    router.push(user ? "/dashboard" : "/");
    return r;
  }, (r) => (r.deleted === "trash" ? "Moved to trash" : "Note deleted"));
  const onSlugChanged = (s) => {
    const k = editKeys.get(slug); if (k) { editKeys.set(s, k); editKeys.remove(slug); }
    setSlug(s); refs.current.slug = s; patchNote({ slug: s }); history.replaceState(null, "", `/n/${s}`);
  };
  const saveNow = async () => { saver.cancel(); await save(); };

  // ---------- fullscreen + shortcuts ----------
  const toggleZen = useCallback(() => {
    setZen((z) => {
      const next = !z;
      try { next ? document.documentElement.requestFullscreen?.() : document.fullscreenElement && document.exitFullscreen?.(); } catch {}
      return next;
    });
  }, []);
  useEffect(() => {
    const onFs = () => { if (!document.fullscreenElement) setZen(false); };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
      if (!mod) return;
      if (k === "s") { e.preventDefault(); saveNow(); toast.success("Saved"); }
      else if (k === "h") { e.preventDefault(); setFindOpen(true); }
      else if (k === "f" && e.shiftKey) { e.preventDefault(); toggleZen(); }
      else if (k === "f" && e.target.closest?.("[data-editor-surface]")) { e.preventDefault(); setFindOpen(true); }
      else if (k === "k" && editor?.isFocused && refs.current.mode === "rich") { e.preventDefault(); addLink(); }
      else if (k === "/") { e.preventDefault(); setDlg("shortcuts"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- derived ----------
  const stats = useMemo(() => {
    const t = mode === "rich" ? richText : text;
    const words = countWords(t);
    return { words, chars: t.length, minutes: Math.max(1, Math.ceil(words / 200)) };
  }, [mode, richText, text]);

  // ---------- render ----------
  if (phase.name === "loading") {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <Skeleton className="h-10 w-2/3" /><Skeleton className="mt-6 h-6 w-full" /><Skeleton className="mt-3 h-6 w-5/6" /><Skeleton className="mt-3 h-64 w-full" />
      </div>
    );
  }
  if (phase.name === "locked") return <PasswordGate slug={slug} onUnlocked={() => { setPhase({ name: "loading" }); load(); }} />;
  if (phase.name === "error") {
    const gone = phase.status === 410, missing = phase.status === 404;
    return (
      <StatusScreen icon={gone ? Clock : AlertTriangle} title={gone ? "This note is no longer available" : missing ? "Note not found" : "Couldn't open this note"}
        text={gone ? phase.message : missing ? "It may have expired, been deleted, or the link is wrong." : phase.message}>
        <Button asChild><Link href="/">Home</Link></Button>
      </StatusScreen>
    );
  }

  if (!note) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <Skeleton className="h-10 w-2/3" /><Skeleton className="mt-6 h-64 w-full" />
      </div>
    );
  }

  const statusLabel = { saved: updatedAt ? `Saved ${timeAgo(updatedAt)}` : "Saved", saving: "Saving…", dirty: "Unsaved changes", error: "Couldn't save" }[saveState];
  const mdShowEdit = mdView !== "preview", mdShowPreview = mdView !== "edit";
  const pageMaxWidth = "max-w-7xl";

  return (
    <div className="flex min-h-dvh flex-col" data-editor-surface>
      {!zen && (
        <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
          <div className={`mx-auto flex items-center gap-2 px-4 py-2 ${pageMaxWidth}`}>
            <Logo href={user ? "/dashboard" : "/"} />
            <span className={`ml-2 hidden items-center gap-1.5 text-xs sm:flex ${saveState === "error" ? "text-destructive" : "text-muted-foreground"}`} aria-live="polite">
              {saveState === "saving" ? <Loader2 className="size-3 animate-spin" /> : saveState === "saved" ? <Check className="size-3" /> : <Clock className="size-3" />}
              {statusLabel}
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              {canEdit && (
                <Select value={mode} onChange={(e) => switchMode(e.target.value)} className="hidden h-8 w-32 sm:block" aria-label="Editing mode">
                  {Object.entries(MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              )}
              <Button size="sm" onClick={() => setDlg("share")}><Share2 /> <span className="hidden sm:inline">Share</span></Button>
              {note.access.isManager && <Button size="icon-sm" variant="outline" aria-label="Note settings" onClick={() => setDlg("settings")}><Settings2 /></Button>}
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button size="icon-sm" variant="outline" aria-label="Export"><Download /></Button></DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Export as</DropdownMenuLabel>
                  {[["txt", "Plain text (.txt)"], ["md", "Markdown (.md)"], ["html", "HTML (.html)"], ["pdf", "PDF (.pdf)"]].map(([f, l]) => (
                    <DropdownMenuItem key={f} onSelect={() => saveNow().then(() => downloadExport(slug, f)).catch((e) => toast.error(e.message))}>{l}</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button size="icon-sm" variant="outline" aria-label="More actions"><MoreHorizontal /></Button></DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onSelect={() => setFindOpen(true)}><Search /> Find and replace</DropdownMenuItem>
                  {canEdit && <DropdownMenuItem onSelect={() => setDlg("versions")}><History /> Version history</DropdownMenuItem>}
                  {canEdit && <DropdownMenuItem onSelect={() => pickFile("any")}><Paperclip /> Attach file</DropdownMenuItem>}
                  {canEdit && <DropdownMenuItem onSelect={() => importRef.current?.click()}><FileUp /> Import file</DropdownMenuItem>}
                  <DropdownMenuItem onSelect={duplicate}><Copy /> Duplicate note</DropdownMenuItem>
                  {user && <DropdownMenuItem onSelect={star}><Star /> {note.starred ? "Remove star" : "Star note"}</DropdownMenuItem>}
                  {note.access.isOwner && <DropdownMenuItem onSelect={archive}><Archive /> {note.isArchived ? "Unarchive" : "Archive"}</DropdownMenuItem>}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={toggleZen}><Maximize2 /> Full screen</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setDlg("shortcuts")}><Keyboard /> Keyboard shortcuts</DropdownMenuItem>
                  {note.access.isManager && (<><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => setDlg("delete")} className="text-destructive"><Trash2 /> Delete note</DropdownMenuItem></>)}
                </DropdownMenuContent>
              </DropdownMenu>
              <ThemeToggle size="icon-sm" />
            </div>
          </div>

          {!canEdit && (
            <div className="border-t bg-accent px-4 py-2 text-center text-sm">
              <div className={`mx-auto ${pageMaxWidth}`}>
                You're viewing this note in read-only mode. <button onClick={duplicate} className="font-medium text-primary underline cursor-pointer">Make a copy</button> to edit your own version.
              </div>
            </div>
          )}

          {canEdit && mode === "rich" && editor && (
            <div className="border-t bg-card/40">
              <Toolbar editor={editor} onImage={() => pickFile("image")} onLink={addLink} onFind={() => setFindOpen(true)} maxWidth={pageMaxWidth} />
            </div>
          )}

          {canEdit && mode === "markdown" && (
            <div className="border-t bg-card/40">
              <div className={`mx-auto flex items-center gap-2 px-4 py-1.5 ${pageMaxWidth}`}>
                <div role="group" aria-label="Markdown view" className="flex rounded-lg border p-0.5 text-xs bg-card">
                  {[["edit", "Write"], ["split", "Split"], ["preview", "Preview"]].map(([v, l]) => (
                    <button key={v} onClick={() => setMdView(v)} aria-pressed={mdView === v} className={`rounded-md px-2.5 py-1 cursor-pointer transition-colors ${mdView === v ? "bg-accent text-primary font-medium" : "hover:bg-muted"}`}>{l}</button>
                  ))}
                </div>
                <Button variant="ghost" size="sm" onClick={() => pickFile("image")}><ImageIcon /> Image</Button>
                <Select value={mode} onChange={(e) => switchMode(e.target.value)} className="ml-auto h-8 w-32 sm:hidden" aria-label="Editing mode">
                  {Object.entries(MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </div>
            </div>
          )}
        </header>
      )}

      {zen && (
        <Button variant="outline" size="icon-sm" className="fixed right-3 top-3 z-40 bg-card" onClick={toggleZen} aria-label="Exit full screen"><Minimize2 /></Button>
      )}
      {canEdit && mode !== "markdown" && !zen && (
        <div className={`mx-auto px-4 pt-2 sm:hidden ${pageMaxWidth}`}>
          <Select value={mode} onChange={(e) => switchMode(e.target.value)} className="h-8" aria-label="Editing mode">
            {Object.entries(MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </div>
      )}

      <main className={`mx-auto w-full flex-1 px-4 py-5 ${pageMaxWidth}`}>
        <input
          value={title} readOnly={!canEdit} maxLength={255} placeholder="Untitled"
          onChange={(e) => { setTitle(e.target.value); refs.current.title = e.target.value; touch(); }}
          aria-label="Note title"
          className="mb-4 w-full bg-transparent px-1 text-3xl font-bold tracking-tight placeholder:text-muted-foreground/60 focus:outline-none"
        />
        <div className="min-h-[60vh] rounded-xl border bg-card p-4 shadow-sm sm:p-6">
          {mode === "rich" && <EditorContent editor={editor} />}
          {mode === "plain" && (
            <textarea ref={textareaRef} value={text} readOnly={!canEdit} onChange={(e) => { setText(e.target.value); refs.current.text = e.target.value; touch(); }}
              aria-label="Note content" placeholder="Start writing…" className="min-h-[55vh] w-full resize-none bg-transparent font-mono text-[0.95rem] leading-7 focus:outline-none" />
          )}
          {mode === "markdown" && (
            <div className={`grid gap-6 ${mdShowEdit && mdShowPreview && canEdit ? "md:grid-cols-2" : ""}`}>
              {canEdit && mdShowEdit && (
                <textarea ref={textareaRef} value={text} onChange={(e) => { setText(e.target.value); refs.current.text = e.target.value; touch(); }}
                  aria-label="Markdown source" placeholder="# Write Markdown here" className="min-h-[55vh] w-full resize-none bg-transparent font-mono text-[0.92rem] leading-7 focus:outline-none" />
              )}
              {(!canEdit || mdShowPreview) && <Rendered html={markdownToHtml(text)} className={canEdit && mdShowEdit ? "border-l pl-6 max-md:border-l-0 max-md:pl-0" : ""} />}
            </div>
          )}
          {!canEdit && mode === "plain" && null}
        </div>
      </main>

      {!zen && (
        <footer className="sticky bottom-0 z-10 border-t bg-background/90 backdrop-blur">
          <div className={`mx-auto flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1.5 text-xs text-muted-foreground ${pageMaxWidth}`}>
            <span>{stats.words} words</span><span>{stats.chars} characters</span><span>{stats.minutes} min read</span>
            <span className="sm:hidden">{statusLabel}</span>
            {note.isAnonymous && !user && note.access.isManager && (
              <span className="ml-auto"><Link href="/register" className="text-primary underline">Create an account</Link> to keep this note in a dashboard</span>
            )}
            {note.expiresAt && <span className="ml-auto flex items-center gap-1"><Clock className="size-3" /> Expires {new Date(note.expiresAt).toLocaleString()}</span>}
          </div>
        </footer>
      )}

      {findOpen && editor && (
        <FindReplace mode={mode} editor={editor} text={text} setText={(t) => { setText(t); refs.current.text = t; touch(); }} textareaRef={textareaRef} readOnly={!canEdit} onClose={() => { setFindOpen(false); editor.commands.focus(); }} />
      )}

      <input ref={fileRef} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) upload(f, attachKind.current === "image"); }} />
      <input ref={importRef} type="file" hidden accept=".txt,.md,.markdown,.html,.htm,text/plain,text/markdown,text/html" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; importFile(f); }} />

      <ShareDialog open={dlg === "share"} onOpenChange={(o) => !o && setDlg(null)} note={note} slug={slug} user={user} onNoteChange={patchNote} />
      {note.access.isManager && (
        <SettingsDialog open={dlg === "settings"} onOpenChange={(o) => !o && setDlg(null)} note={note} slug={slug} onNoteChange={patchNote} onSlugChanged={onSlugChanged} initialTags={note.tags} />
      )}
      {canEdit && (
        <VersionsDialog open={dlg === "versions"} onOpenChange={(o) => !o && setDlg(null)} note={note} slug={slug} contentType={mode}
          beforeOpen={saveNow} onRestored={() => { setPhase({ name: "loading" }); load(); }} />
      )}

      <Dialog open={dlg === "delete"} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this note?</DialogTitle>
            <DialogDescription>{note.isAnonymous ? "This permanently deletes the note and its link." : "It moves to Trash, where you can restore it for 30 days."}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDlg(null)}>Cancel</Button>
            <Button variant="destructive" onClick={remove}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dlg === "shortcuts"} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Keyboard shortcuts</DialogTitle></DialogHeader>
          <dl className="grid gap-2 text-sm">
            {SHORTCUTS.map(([a, b]) => (<div key={a} className="flex justify-between gap-4 border-b pb-2"><dt>{a}</dt><dd className="font-mono text-xs text-muted-foreground">{b}</dd></div>))}
          </dl>
        </DialogContent>
      </Dialog>
    </div>
  );
}
