"use client";
import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Copy, Loader2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { api, editKeys } from "@/lib/api-client";

const copy = async (text, msg) => {
  try { await navigator.clipboard.writeText(text); toast.success(msg); } catch { toast.error("Could not copy"); }
};

export function ShareDialog({ open, onOpenChange, note, slug, user, onNoteChange }) {
  const [qr, setQr] = useState("");
  const [people, setPeople] = useState({ collaborators: [], pending: [] });
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState("VIEW");
  const [busy, setBusy] = useState(false);

  const url = typeof window !== "undefined" ? `${location.origin}/n/${note.slug}` : "";
  const editKey = editKeys.get(slug);
  const editUrl = note.isAnonymous && note.access.isManager && editKey ? `${url}#key=${editKey}` : null;
  const isOwner = note.access.isOwner;

  useEffect(() => { if (open && url) QRCode.toDataURL(url, { margin: 1, width: 220 }).then(setQr).catch(() => {}); }, [open, url]);

  const loadPeople = useCallback(() => api(`/notes/${note.id}/invite`, { slug }).then(setPeople).catch(() => {}), [note.id, slug]);
  useEffect(() => { if (open && isOwner) loadPeople(); }, [open, isOwner, loadPeople]);

  const toggleEdit = async (checked) => {
    try {
      const r = await api(`/notes/${note.id}/share`, { method: "POST", slug, body: { sharePermission: checked ? "edit" : "view" } });
      onNoteChange({ sharePermission: r.sharePermission });
      toast.success(checked ? "Anyone with the link can edit" : "Link is now read-only");
    } catch (e) { toast.error(e.message); }
  };

  const invite = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api(`/notes/${note.id}/invite`, { method: "POST", slug, body: { email, permission } });
      toast.success(`Invitation sent to ${email}`);
      if (r.devInviteUrl) console.log("Invite link (dev):", r.devInviteUrl);
      setEmail(""); loadPeople();
    } catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };
  const revoke = async (body) => {
    try { await api(`/notes/${note.id}/invite`, { method: "DELETE", slug, body }); loadPeople(); } catch (e) { toast.error(e.message); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share note</DialogTitle>
          <DialogDescription>
            {note.privacy === "private" ? "This note is private. Only you and invited people can open it." : "Anyone with the link can open this note."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <Label htmlFor="share-url">Link</Label>
          <div className="flex gap-2">
            <Input id="share-url" readOnly value={url} onFocus={(e) => e.target.select()} />
            <Button variant="outline" onClick={() => copy(url, "Link copied")}><Copy /> Copy</Button>
          </div>
          {editUrl && (
            <div className="mt-1 grid gap-1.5">
              <Label htmlFor="edit-url">Edit link (keep this private)</Label>
              <div className="flex gap-2">
                <Input id="edit-url" readOnly value={editUrl} onFocus={(e) => e.target.select()} />
                <Button variant="outline" onClick={() => copy(editUrl, "Edit link copied")}><Copy /> Copy</Button>
              </div>
              <p className="text-xs text-muted-foreground">Whoever has this link can edit and delete the note, from any device.</p>
            </div>
          )}
        </div>

        {note.access.isManager && (
          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div>
              <Label htmlFor="link-edit">Anyone with the link can edit</Label>
              <p className="text-xs text-muted-foreground">Off means the link is read-only.</p>
            </div>
            <Switch id="link-edit" checked={note.sharePermission === "edit"} onCheckedChange={toggleEdit} />
          </div>
        )}

        {qr && (
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="QR code for this note" width={110} height={110} className="rounded-lg border bg-white p-1" />
            <p className="text-sm text-muted-foreground">Scan to open this note on another device.</p>
          </div>
        )}

        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold">People</h3>
          {isOwner ? (
            <>
              <form onSubmit={invite} className="mt-2 flex flex-wrap gap-2">
                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" className="min-w-40 flex-1" aria-label="Invite by email" />
                <Select value={permission} onChange={(e) => setPermission(e.target.value)} className="w-28" aria-label="Permission">
                  <option value="VIEW">Can view</option><option value="EDIT">Can edit</option>
                </Select>
                <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />}Invite</Button>
              </form>
              <ul className="mt-3 grid gap-1.5 text-sm">
                {people.collaborators.map((c) => (
                  <li key={c.userId} className="flex items-center justify-between rounded-lg bg-muted px-3 py-1.5">
                    <span>{c.name} <span className="text-muted-foreground">({c.email}) · {c.permission.toLowerCase()}</span></span>
                    <Button variant="ghost" size="icon-sm" aria-label={`Remove ${c.name}`} onClick={() => revoke({ userId: c.userId })}><Trash2 /></Button>
                  </li>
                ))}
                {people.pending.map((p) => (
                  <li key={p.id} className="flex items-center justify-between rounded-lg border border-dashed px-3 py-1.5">
                    <span>{p.email} <span className="text-muted-foreground">· invited, {p.permission.toLowerCase()}</span></span>
                    <Button variant="ghost" size="icon-sm" aria-label={`Cancel invite for ${p.email}`} onClick={() => revoke({ invitationId: p.id })}><Trash2 /></Button>
                  </li>
                ))}
                {!people.collaborators.length && !people.pending.length && <li className="text-muted-foreground">Nobody else has been invited yet.</li>}
              </ul>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">{user ? "Only the owner can invite people." : "Log in with an account to invite people by email."}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
