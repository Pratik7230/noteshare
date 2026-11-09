import sanitizeHtml from "sanitize-html";

const OPTS = {
  allowedTags: [
    "p", "br", "strong", "b", "em", "i", "u", "s", "del", "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li", "blockquote", "hr", "a", "code", "pre", "span", "img",
    "table", "thead", "tbody", "tr", "th", "td", "colgroup", "col", "label", "input", "div",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    code: ["class"], pre: ["class"], span: ["class"],
    ul: ["data-type"], li: ["data-type", "data-checked"], div: [],
    input: ["type", "checked", "disabled"], label: [],
    th: ["colspan", "rowspan", "colwidth"], td: ["colspan", "rowspan", "colwidth"],
  },
  allowedClasses: { code: [/^language-[\w-]+$/, /^hljs.*$/], pre: [/^language-[\w-]+$/], span: [/^hljs.*$/] },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["http", "https"] },
  // Only same-origin attachment URLs or https images in notes.
  transformTags: {
    a: (tag, attribs) => ({ tagName: "a", attribs: { ...attribs, rel: "noopener noreferrer nofollow", target: "_blank" } }),
    input: (tag, attribs) => ({ tagName: "input", attribs: { type: "checkbox", disabled: "disabled", ...(attribs.checked !== undefined ? { checked: "checked" } : {}) } }),
  },
  allowProtocolRelative: false,
};

export function sanitizeNoteHtml(html) {
  return sanitizeHtml(String(html || ""), {
    ...OPTS,
    allowedSchemes: OPTS.allowedSchemes,
    exclusiveFilter: (f) => f.tag === "img" && !/^(\/api\/attachments\/[0-9a-f-]{36}|https?:\/\/)/i.test(f.attribs.src || ""),
  });
}

export const stripHtml = (html) => sanitizeHtml(String(html || ""), { allowedTags: [], allowedAttributes: {} });
