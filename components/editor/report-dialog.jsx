"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";

export function ReportDialog({ open, onOpenChange, noteId, slug }) {
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      await api(`/notes/${noteId}/report`, { method: "POST", slug, body: { reason, details: details || undefined } });
      toast.success("Thanks. Our moderators will take a look.");
      setDetails(""); onOpenChange(false);
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Report this note</DialogTitle><DialogDescription>Tell us what's wrong. Reports are reviewed by site moderators.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-1.5"><Label htmlFor="rep-reason">Reason</Label>
            <Select id="rep-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="spam">Spam or scam</option><option value="abuse">Harassment or abuse</option><option value="illegal">Illegal content</option><option value="copyright">Copyright</option><option value="other">Something else</option>
            </Select></div>
          <div className="grid gap-1.5"><Label htmlFor="rep-details">Details (optional)</Label>
            <textarea id="rep-details" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={500} rows={3} className="w-full resize-none rounded-lg border bg-card px-3 py-2 text-sm" /></div>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />}Send report</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
