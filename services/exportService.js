import { convert } from "html-to-text";
import TurndownService from "turndown";
import { marked } from "marked";
import PDFDocument from "pdfkit";
import { loadReadable } from "./noteService.js";
import { sanitizeNoteHtml } from "../lib/sanitize.js";
import { badRequest } from "../lib/errors.js";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const td = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });

const toText = (n) => (n.contentType === "rich" ? convert(n.content, { wordwrap: false, selectors: [{ selector: "img", format: "skip" }, { selector: "a", options: { ignoreHref: false } }] }) : n.content);
const toMarkdown = (n) => (n.contentType === "rich" ? td.turndown(n.content) : n.content);
const toHtml = (n) =>
  n.contentType === "rich" ? n.content : n.contentType === "markdown" ? sanitizeNoteHtml(marked.parse(n.content, { async: false })) : `<pre>${esc(n.content)}</pre>`;

export const exportService = {
  async export(idOrSlug, format, ctx) {
    const { note, access } = await loadReadable(idOrSlug, ctx);
    if (!access.unlocked) throw badRequest("Unlock the note first");
    const name = (note.title || note.slug).replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").slice(0, 60) || note.slug;
    const title = note.title || "Untitled";

    if (format === "txt") return { body: `${title}\n\n${toText(note)}`, type: "text/plain; charset=utf-8", filename: `${name}.txt` };
    if (format === "md") return { body: `# ${title}\n\n${toMarkdown(note)}`, type: "text/markdown; charset=utf-8", filename: `${name}.md` };
    if (format === "html") {
      const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>body{font:16px/1.7 system-ui,sans-serif;max-width:760px;margin:2rem auto;padding:0 1rem}pre{background:#f2f4f8;padding:1rem;overflow:auto;border-radius:8px}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:.3rem .6rem}img{max-width:100%}</style></head><body><h1>${esc(title)}</h1>${toHtml(note)}</body></html>`;
      return { body: html, type: "text/html; charset=utf-8", filename: `${name}.html` };
    }
    if (format === "pdf") {
      const doc = new PDFDocument({ margin: 56, info: { Title: title } });
      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      const done = new Promise((r) => doc.on("end", r));
      doc.font("Helvetica-Bold").fontSize(20).text(title).moveDown();
      doc.font("Helvetica").fontSize(11).text(toText(note), { lineGap: 3 });
      doc.end();
      await done;
      return { body: Buffer.concat(chunks), type: "application/pdf", filename: `${name}.pdf` };
    }
    throw badRequest("Unsupported format");
  },
};
