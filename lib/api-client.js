// Browser-side helpers. Anonymous notes keep a secret edit key in localStorage.
const KEY = (slug) => `ns:editkey:${slug}`;

export const editKeys = {
  get(slug) { try { return localStorage.getItem(KEY(slug)); } catch { return null; } },
  set(slug, key) { try { localStorage.setItem(KEY(slug), key); } catch {} },
  remove(slug) { try { localStorage.removeItem(KEY(slug)); } catch {} },
  all() {
    const out = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith("ns:editkey:")) out.push({ slug: k.slice(11), editKey: localStorage.getItem(k) });
      }
    } catch {}
    return out;
  },
};

export class ApiClientError extends Error {
  constructor(message, status, data) { super(message); this.status = status; this.data = data; }
}

export async function api(path, { method = "GET", body, slug } = {}) {
  const headers = {};
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  if (body && !isForm) headers["Content-Type"] = "application/json";
  const key = slug && editKeys.get(slug);
  if (key) headers["x-edit-key"] = key;
  const res = await fetch(`/api${path}`, { method, headers, body: isForm ? body : body ? JSON.stringify(body) : undefined, credentials: "same-origin" });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiClientError(data?.error || "Request failed", res.status, data);
  return data;
}

export async function createNote(input = {}) {
  const r = await api("/notes", { method: "POST", body: input });
  if (r.editKey) editKeys.set(r.slug, r.editKey);
  return r;
}

/** After signing in, attach notes created as a guest on this device to the account. */
export async function claimLocalNotes() {
  const items = editKeys.all();
  if (!items.length) return [];
  try {
    const { claimed } = await api("/notes/claim", { method: "POST", body: { items } });
    claimed.forEach((s) => editKeys.remove(s));
    return claimed;
  } catch { return []; }
}

export async function downloadExport(slug, format) {
  const key = editKeys.get(slug);
  const res = await fetch(`/api/notes/${slug}/export?format=${format}`, { headers: key ? { "x-edit-key": key } : {} });
  if (!res.ok) throw new ApiClientError((await res.json().catch(() => null))?.error || "Export failed", res.status);
  const blob = await res.blob();
  const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") || "")?.[1] || `${slug}.${format}`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export const safeNext = (n) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard");
