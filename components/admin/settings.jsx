"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import { PageHeader } from "./ui";

function Row({ id, title, text, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div><Label htmlFor={id}>{title}</Label><p className="text-xs text-muted-foreground">{text}</p></div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export default function Settings() {
  const [s, setS] = useState(null);
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState("");

  useEffect(() => { api("/admin/settings").then((r) => { setS(r.settings); setSaved(r.settings); }).catch((e) => toast.error(e.message)); }, []);
  if (!s) return <><PageHeader title="Settings" /><Skeleton className="h-64 w-full" /></>;

  const dirty = JSON.stringify(s) !== JSON.stringify(saved);
  const save = async () => {
    setBusy("save");
    try { const r = await api("/admin/settings", { method: "PUT", body: s }); setS(r.settings); setSaved(r.settings); toast.success("Settings saved"); }
    catch (e) { toast.error(e.message); } finally { setBusy(""); }
  };
  const cleanup = async () => {
    setBusy("cleanup");
    try { const r = await api("/admin/maintenance/cleanup", { method: "POST" }); toast.success(`Cleanup done: ${r.expired} expired and ${r.trashed} trashed notes removed`); }
    catch (e) { toast.error(e.message); } finally { setBusy(""); }
  };
  const ann = s.announcement;

  return (
    <>
      <PageHeader title="Settings" subtitle="Site-wide controls. Changes apply within seconds.">
        <Button onClick={save} disabled={!dirty || busy === "save"}>{busy === "save" && <Loader2 className="animate-spin" />}Save changes</Button>
      </PageHeader>
      <div className="grid gap-5">
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="font-semibold">Access</h2>
          <div className="divide-y">
            <Row id="reg" title="Allow new sign-ups" text="Turn off to close registration. Existing users can still log in." checked={s.registrationOpen} onChange={(v) => setS({ ...s, registrationOpen: v })} />
            <Row id="anon" title="Allow notes without an account" text="Turn off to require login before creating a note." checked={s.anonymousNotesEnabled} onChange={(v) => setS({ ...s, anonymousNotesEnabled: v })} />
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="font-semibold">Announcement banner</h2>
          <div className="divide-y">
            <Row id="ann" title="Show a banner on every page" text="Visitors can dismiss it. Changing the text shows it again." checked={ann.enabled} onChange={(v) => setS({ ...s, announcement: { ...ann, enabled: v } })} />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_9rem]">
            <div className="grid gap-1.5">
              <Label htmlFor="ann-text">Message</Label>
              <textarea id="ann-text" value={ann.text} maxLength={300} rows={2} onChange={(e) => setS({ ...s, announcement: { ...ann, text: e.target.value } })}
                className="w-full resize-none rounded-lg border bg-card px-3 py-2 text-sm" placeholder="Scheduled maintenance on Sunday at 02:00 UTC" />
            </div>
            <div className="grid gap-1.5"><Label htmlFor="ann-level">Style</Label>
              <Select id="ann-level" value={ann.level} onChange={(e) => setS({ ...s, announcement: { ...ann, level: e.target.value } })}><option value="info">Info</option><option value="warning">Warning</option></Select></div>
          </div>
          {ann.text && <div className={`mt-3 rounded-lg px-4 py-2 text-center text-sm ${ann.level === "warning" ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-accent text-primary"}`}>{ann.text}</div>}
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="font-semibold">Maintenance</h2>
          <p className="mt-1 text-sm text-muted-foreground">Removes expired notes and notes that have sat in trash for 30 days. This also runs automatically every 10 minutes.</p>
          <Button variant="outline" className="mt-3" onClick={cleanup} disabled={busy === "cleanup"}>{busy === "cleanup" ? <Loader2 className="animate-spin" /> : <Wrench />}Run cleanup now</Button>
        </section>
      </div>
    </>
  );
}
