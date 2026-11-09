"use client";
import { marked } from "marked";
import DOMPurify from "dompurify";

let hooked = false;
export function sanitizeHtml(html) {
  if (typeof window === "undefined") return "";
  if (!hooked) {
    DOMPurify.addHook("afterSanitizeAttributes", (node) => {
      if (node.tagName === "A") { node.setAttribute("target", "_blank"); node.setAttribute("rel", "noopener noreferrer nofollow"); }
    });
    hooked = true;
  }
  return DOMPurify.sanitize(html);
}
export const markdownToHtml = (md) => sanitizeHtml(marked.parse(md || "", { async: false, breaks: true }));
export const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const plainToHtml = (t) =>
  t.split(/\n{2,}/).map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`).join("");

export function Rendered({ html, className = "" }) {
  return <div className={`prose-note ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
