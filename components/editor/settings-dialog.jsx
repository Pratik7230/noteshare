"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api-client";

const HOUR = 3600 * 1000;
const PRESETS = { never: null, "1h": HOUR, "1d": 24 * HOUR, "7d": 7 * 24 * HOUR, "30d": 30 * 24 * HOUR };
const toLocalInput = (iso) => { if (!iso) return ""; const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null);

function Section({ title, hint, children }) {
  return (
    <section className="grid gap-2 border-t pt-4 first:border-t-0 first:pt-0">
      <div><h3 className="text-sm font-semibold">{title}</h3>{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>
      {children}
    </section>
  );
}

export function SettingsDialog({ open, onOpenChange, note, slug, onNoteChange, onSlugChanged, initialTags }) {
  const [privacy, setPrivacy] = useState(note.privacy);
  const [password, setPassword] = useState("");
  const [preset, setPreset] = useState("never");
  const [custom, setCustom] = useState(toLocalInput(note.expiresAt));
  const [accessExp, setAccessExp] = useState(toLocalInput(note.accessExpiresAt));
  const [maxViews, setMaxViews] = useState(note.maxViews ?? "");
  const [newSlug, setNewSlug] = useState(note.slug);
  const [slugState, setSlugState] = useState({ ok: true, msg: "" });
  const [tags, setTags] = useState((initialTags || []).join(", "));
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!open) return;
    setPrivacy(note.privacy); setNewSlug(note.slug); setMaxViews(note.maxViews ?? "");
    setPreset(note.expiresAt ? "custom" : "never"); setCustom(toLocalInput(note.expiresAt)); setAccessExp(toLocalInput(note.accessExpiresAt));
    api(`/notes/${note.id}/analytics`, { slug }).then(setStats).catch(() => {});
  }, [open, note.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live slug availability check.
  useEffect(() => {
    if (!open || newSlug === note.slug) { setSlugState({ ok: true, msg: "" }); return; }
    const t = setTimeout(() => {
      api(`/notes/check-slug?slug=${encodeURIComponent(newSlug)}&except=${note.id}`)
        .then((r) => setSlugState({ ok: r.available, msg: r.available ? "Available" : r.reason })).catch(() => {});
    }, 350);
    return () => clearTimeout(t);
  }, [newSlug, open, note.slug, note.id]);

  const run = async (fn, okMsg) => { try { await fn(); toast.success(okMsg); } catch (e) { toast.error(e.message); } };
  const patchPrivacy = (body) => api(`/notes/${note.id}/privacy`, { method: "PATCH", slug, body }).then((r) => onNoteChange({ privacy: r.privacy, hasPassword: r.hasPassword, accessExpiresAt: r.accessExpiresAt, maxViews: r.maxViews }));

  const saveExpiry = () => {
    const iso = preset === "custom" ? fromLocalInput(custom) : PRESETS[preset] ? new Date(Date.now() + PRESETS[preset]).toISOString() : null;
    return run(async () => {
      await api(`/notes/${note.id}`, { method: "PATCH", slug, body: { expiresAt: iso } });
      onNoteChange({ expiresAt: iso });
    }, iso ? "Expiry set" : "Note will not expire");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Note settings</DialogTitle>
          <DialogDescription>Address, privacy, expiry and stats.</DialogDescription>
        </DialogHeader>

        <Section title="Address" hint="Letters, numbers and hyphens. Old links keep redirecting.">
          <div className="flex gap-2">
            <div className="flex flex-1 items-center rounded-lg border bg-card pl-3 text-sm text-muted-foreground">/n/
              <Input value={newSlug} onChange={(e) => setNewSlug(e.target.value.toLowerCase())} className="border-0 shadow-none focus-visible:outline-none" aria-label="Custom address" />
            </div>
            <Button variant="outline" disabled={newSlug === note.slug || !slugState.ok} onClick={() => run(async () => {
              await api(`/notes/${note.id}`, { method: "PATCH", slug, body: { slug: newSlug } });
              onSlugChanged(newSlug);
            }, "Address updated")}>Save</Button>
          </div>
          {slugState.msg && <p className={`text-xs ${slugState.ok ? "text-primary" : "text-destructive"}`}>{slugState.msg}</p>}
        </Section>

        <Section title="Privacy" hint="Public and unlisted notes open for anyone with the link. Private is owner-only (needs an account).">
          <div className="flex gap-2">
            <Select value={privacy} onChange={(e) => setPrivacy(e.target.value)} aria-label="Privacy">
              <option value="public">Public</option><option value="unlisted">Unlisted</option>
              <option value="private" disabled={note.isAnonymous}>Private{note.isAnonymous ? " (log in to use)" : ""}</option>
            </Select>
            <Button variant="outline" disabled={privacy === note.privacy} onClick={() => run(() => patchPrivacy({ privacy }), "Privacy updated")}>Save</Button>
          </div>
        </Section>

        <Section title="Password" hint="Checked on the server. Owners never need to enter it.">
          <div className="flex gap-2">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={note.hasPassword ? "New password" : "Set a password (4+ characters)"} autoComplete="new-password" />
            <Button variant="outline" disabled={password.length < 4} onClick={() => run(async () => { await patchPrivacy({ password }); setPassword(""); }, "Password saved")}>{note.hasPassword ? "Change" : "Set"}</Button>
            {note.hasPassword && <Button variant="ghost" onClick={() => run(() => patchPrivacy({ password: null }), "Password removed")}>Remove</Button>}
          </div>
        </Section>

        <Section title="Note expiration" hint="The note is deleted automatically after this time.">
          <div className="flex flex-wrap gap-2">
            <Select value={preset} onChange={(e) => setPreset(e.target.value)} className="w-44" aria-label="Expiration">
              <option value="never">Never expire</option><option value="1h">In 1 hour</option><option value="1d">In 1 day</option>
              <option value="7d">In 7 days</option><option value="30d">In 30 days</option><option value="custom">Custom date…</option>
            </Select>
            {preset === "custom" && <Input type="datetime-local" value={custom} onChange={(e) => setCustom(e.target.value)} className="w-56" aria-label="Custom expiry" />}
            <Button variant="outline" onClick={saveExpiry}>Save</Button>
          </div>
          {note.expiresAt && <p className="text-xs text-muted-foreground">Currently expires {new Date(note.expiresAt).toLocaleString()}.</p>}
        </Section>

        <Section title="Access limits" hint="For people other than you. Optional.">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1"><Label htmlFor="acc-exp" className="text-xs">Link stops working at</Label>
              <Input id="acc-exp" type="datetime-local" value={accessExp} onChange={(e) => setAccessExp(e.target.value)} /></div>
            <div className="grid gap-1"><Label htmlFor="max-views" className="text-xs">View limit</Label>
              <Input id="max-views" type="number" min={1} value={maxViews} onChange={(e) => setMaxViews(e.target.value)} placeholder="Unlimited" /></div>
          </div>
          <div><Button variant="outline" onClick={() => run(() => patchPrivacy({ accessExpiresAt: fromLocalInput(accessExp), maxViews: maxViews === "" ? null : Number(maxViews) }), "Limits saved")}>Save limits</Button></div>
        </Section>

        {!note.isAnonymous && (
          <Section title="Tags" hint="Comma separated. Used for filtering in your dashboard.">
            <div className="flex gap-2">
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="work, ideas" />
              <Button variant="outline" onClick={() => run(() => api(`/notes/${note.id}/tags`, { method: "PUT", slug, body: { tags: tags.split(",").map((t) => t.trim()).filter(Boolean) } }), "Tags saved")}>Save</Button>
            </div>
          </Section>
        )}

        {stats && (
          <Section title="Analytics">
            <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              {[["Views", stats.totalViews], ["Unique", stats.uniqueViews], ["Last viewed", stats.lastAccessed ? new Date(stats.lastAccessed).toLocaleDateString() : "never"], ["Created", new Date(stats.createdAt).toLocaleDateString()]].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-muted p-2.5"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-semibold">{v}</dd></div>
              ))}
            </dl>
            <p className="text-xs text-muted-foreground">Your own visits aren't counted. Unique views use a daily anonymous hash, not IP addresses.</p>
          </Section>
        )}
      </DialogContent>
    </Dialog>
  );
}
