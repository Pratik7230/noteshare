"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { findMatches, searchKey } from "./search-extension";

function textMatches(text, q, cs) {
  const out = [];
  if (!q) return out;
  const hay = cs ? text : text.toLowerCase(), needle = cs ? q : q.toLowerCase();
  let i = hay.indexOf(needle);
  while (i !== -1) { out.push({ from: i, to: i + q.length }); i = hay.indexOf(needle, i + q.length); }
  return out;
}

/** Works on the rich editor (ProseMirror) or on a plain textarea value. */
export function FindReplace({ mode, editor, text, setText, textareaRef, onClose, readOnly }) {
  const [q, setQ] = useState("");
  const [r, setR] = useState("");
  const [cs, setCs] = useState(false);
  const [cur, setCur] = useState(0);
  const [tick, setTick] = useState(0); // recompute after edits
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const rich = mode === "rich";
  const matches = useMemo(
    () => (rich ? findMatches(editor.state.doc, q, cs) : textMatches(text, q, cs)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rich, editor, q, cs, text, tick]
  );
  const idx = matches.length ? Math.min(cur, matches.length - 1) : -1;

  // Highlight in the rich editor; clear on close.
  useEffect(() => {
    if (!rich) return;
    editor.view.dispatch(editor.state.tr.setMeta(searchKey, { q, cs, cur: idx }));
  }, [rich, editor, q, cs, idx, tick]);
  useEffect(() => () => { if (editor && !editor.isDestroyed) editor.view.dispatch(editor.state.tr.setMeta(searchKey, { q: "", cs: false, cur: -1 })); }, [editor]);

  const reveal = (i) => {
    const m = matches[i];
    if (!m) return;
    if (rich) {
      const { node } = editor.view.domAtPos(m.from);
      (node.nodeType === 3 ? node.parentElement : node)?.scrollIntoView({ block: "center", behavior: "smooth" });
    } else if (textareaRef.current) {
      const ta = textareaRef.current;
      ta.focus(); ta.setSelectionRange(m.from, m.to);
      inputRef.current?.focus();
    }
  };
  const go = (d) => {
    if (!matches.length) return;
    const n = (idx + d + matches.length) % matches.length;
    setCur(n); reveal(n);
  };

  const replaceOne = () => {
    const m = matches[idx];
    if (!m || readOnly) return;
    if (rich) editor.view.dispatch(editor.state.tr.insertText(r, m.from, m.to));
    else setText(text.slice(0, m.from) + r + text.slice(m.to));
    setTick((t) => t + 1);
  };
  const replaceAll = () => {
    if (!matches.length || readOnly) return;
    if (rich) {
      const tr = editor.state.tr;
      [...matches].reverse().forEach((m) => tr.insertText(r, m.from, m.to));
      editor.view.dispatch(tr);
    } else {
      let out = text;
      [...matches].reverse().forEach((m) => { out = out.slice(0, m.from) + r + out.slice(m.to); });
      setText(out);
    }
    setTick((t) => t + 1);
  };

  return (
    <div className="fixed right-3 top-16 z-40 w-[min(22rem,calc(100vw-1.5rem))] rounded-xl border bg-card p-3 shadow-lg" role="search" aria-label="Find and replace">
      <div className="flex items-center gap-1.5">
        <Input ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setCur(0); }} placeholder="Find"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); go(e.shiftKey ? -1 : 1); } if (e.key === "Escape") onClose(); }} />
        <span className="w-14 shrink-0 text-center text-xs text-muted-foreground">{q ? `${matches.length ? idx + 1 : 0}/${matches.length}` : ""}</span>
        <Button variant="ghost" size="icon-sm" onClick={() => go(-1)} aria-label="Previous match"><ChevronUp /></Button>
        <Button variant="ghost" size="icon-sm" onClick={() => go(1)} aria-label="Next match"><ChevronDown /></Button>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close find"><X /></Button>
      </div>
      {!readOnly && (
        <div className="mt-2 flex items-center gap-1.5">
          <Input value={r} onChange={(e) => setR(e.target.value)} placeholder="Replace with" onKeyDown={(e) => e.key === "Escape" && onClose()} />
          <Button variant="outline" size="sm" onClick={replaceOne} disabled={!matches.length}>Replace</Button>
          <Button variant="outline" size="sm" onClick={replaceAll} disabled={!matches.length}>All</Button>
        </div>
      )}
      <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={cs} onChange={(e) => setCs(e.target.checked)} /> Match case
      </label>
    </div>
  );
}
