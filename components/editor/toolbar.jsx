"use client";
import { useEditorState } from "@tiptap/react";
import {
  Bold, Italic, Underline, Strikethrough, Code, List, ListOrdered, ListChecks, Quote, Minus, SquareCode,
  Link2, Image as ImageIcon, Table as TableIcon, Undo2, Redo2, Search, Rows3, Columns3, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

function Btn({ label, active, disabled, onClick, children }) {
  return (
    <button
      type="button" title={label} aria-label={label} aria-pressed={active} disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} onClick={onClick}
      className={cn("grid size-8 shrink-0 place-items-center rounded-md transition-colors hover:bg-muted disabled:opacity-40 cursor-pointer [&_svg]:size-4", active && "bg-accent text-primary")}
    >{children}</button>
  );
}
const Sep = () => <span className="mx-1 h-5 w-px shrink-0 bg-border" />;

export function Toolbar({ editor, onImage, onLink, onFind, className, maxWidth = "max-w-7xl" }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"), italic: e.isActive("italic"), underline: e.isActive("underline"), strike: e.isActive("strike"),
      code: e.isActive("code"), bullet: e.isActive("bulletList"), ordered: e.isActive("orderedList"), task: e.isActive("taskList"),
      quote: e.isActive("blockquote"), codeBlock: e.isActive("codeBlock"), link: e.isActive("link"), table: e.isActive("table"),
      canUndo: e.can().undo(), canRedo: e.can().redo(),
      heading: [1, 2, 3, 4, 5, 6].find((l) => e.isActive("heading", { level: l })) || 0,
    }),
  });
  const run = (fn) => () => fn(editor.chain().focus()).run();

  return (
    <div className={cn("mx-auto flex items-center gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4 py-1.5", maxWidth, className)} role="toolbar" aria-label="Formatting">
      <Btn label="Undo (Ctrl+Z)" disabled={!s.canUndo} onClick={run((c) => c.undo())}><Undo2 /></Btn>
      <Btn label="Redo (Ctrl+Y)" disabled={!s.canRedo} onClick={run((c) => c.redo())}><Redo2 /></Btn>
      <Sep />
      <select
        aria-label="Text style" value={s.heading}
        onChange={(e) => { const l = Number(e.target.value); l ? editor.chain().focus().setHeading({ level: l }).run() : editor.chain().focus().setParagraph().run(); }}
        className="h-8 shrink-0 rounded-md border bg-card px-2 text-sm cursor-pointer"
      >
        <option value={0}>Paragraph</option>
        {[1, 2, 3, 4, 5, 6].map((l) => <option key={l} value={l}>Heading {l}</option>)}
      </select>
      <Sep />
      <Btn label="Bold (Ctrl+B)" active={s.bold} onClick={run((c) => c.toggleBold())}><Bold /></Btn>
      <Btn label="Italic (Ctrl+I)" active={s.italic} onClick={run((c) => c.toggleItalic())}><Italic /></Btn>
      <Btn label="Underline (Ctrl+U)" active={s.underline} onClick={run((c) => c.toggleUnderline())}><Underline /></Btn>
      <Btn label="Strikethrough" active={s.strike} onClick={run((c) => c.toggleStrike())}><Strikethrough /></Btn>
      <Btn label="Inline code" active={s.code} onClick={run((c) => c.toggleCode())}><Code /></Btn>
      <Sep />
      <Btn label="Bullet list" active={s.bullet} onClick={run((c) => c.toggleBulletList())}><List /></Btn>
      <Btn label="Numbered list" active={s.ordered} onClick={run((c) => c.toggleOrderedList())}><ListOrdered /></Btn>
      <Btn label="Checklist" active={s.task} onClick={run((c) => c.toggleTaskList())}><ListChecks /></Btn>
      <Sep />
      <Btn label="Blockquote" active={s.quote} onClick={run((c) => c.toggleBlockquote())}><Quote /></Btn>
      <Btn label="Code block" active={s.codeBlock} onClick={run((c) => c.toggleCodeBlock())}><SquareCode /></Btn>
      <Btn label="Horizontal divider" onClick={run((c) => c.setHorizontalRule())}><Minus /></Btn>
      <Sep />
      <Btn label="Link (Ctrl+K)" active={s.link} onClick={onLink}><Link2 /></Btn>
      <Btn label="Insert image" onClick={onImage}><ImageIcon /></Btn>
      <Btn label="Insert table" onClick={run((c) => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true }))}><TableIcon /></Btn>
      {s.table && (
        <>
          <Btn label="Add row" onClick={run((c) => c.addRowAfter())}><Rows3 /></Btn>
          <Btn label="Add column" onClick={run((c) => c.addColumnAfter())}><Columns3 /></Btn>
          <Btn label="Delete row" onClick={run((c) => c.deleteRow())}><span className="text-xs font-semibold">−R</span></Btn>
          <Btn label="Delete column" onClick={run((c) => c.deleteColumn())}><span className="text-xs font-semibold">−C</span></Btn>
          <Btn label="Delete table" onClick={run((c) => c.deleteTable())}><Trash2 /></Btn>
        </>
      )}
      <Sep />
      <Btn label="Find and replace (Ctrl+H)" onClick={onFind}><Search /></Btn>
    </div>
  );
}
