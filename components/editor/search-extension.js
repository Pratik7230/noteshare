import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const searchKey = new PluginKey("noteSearch");

export function findMatches(doc, query, caseSensitive) {
  const out = [];
  if (!query) return out;
  const needle = caseSensitive ? query : query.toLowerCase();
  doc.descendants((node, pos) => {
    if (!node.isText) return;
    const hay = caseSensitive ? node.text : node.text.toLowerCase();
    let i = hay.indexOf(needle);
    while (i !== -1) {
      out.push({ from: pos + i, to: pos + i + query.length });
      i = hay.indexOf(needle, i + query.length);
    }
  });
  return out;
}

/** Highlights find-and-replace matches without moving focus out of the find box. */
export const SearchHighlight = Extension.create({
  name: "searchHighlight",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: searchKey,
        state: {
          init: () => ({ q: "", cs: false, cur: -1 }),
          apply(tr, value) {
            const meta = tr.getMeta(searchKey);
            return meta ? { ...value, ...meta } : value;
          },
        },
        props: {
          decorations(state) {
            const { q, cs, cur } = searchKey.getState(state);
            if (!q) return null;
            const matches = findMatches(state.doc, q, cs);
            return DecorationSet.create(
              state.doc,
              matches.map((m, i) => Decoration.inline(m.from, m.to, { class: i === cur ? "find-hit find-cur" : "find-hit" }))
            );
          },
        },
      }),
    ];
  },
});
