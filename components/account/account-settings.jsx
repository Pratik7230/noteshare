"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Camera, Loader2, MailCheck, MailWarning, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/avatar";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api-client";

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = ["image/png", "image/jpeg", "image/webp"];

function Card({ title, description, children }) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}
const Spin = ({ show }) => (show ? <Loader2 className="animate-spin" /> : null);

export default function AccountSettings() {
  const router = useRouter();
  const { user, loading, refresh, setUser } = useAuth();
  const fileRef = useRef(null);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [busy, setBusy] = useState("");
  const [preview, setPreview] = useState(null);
  const [email, setEmail] = useState("");
  const [emailPw, setEmailPw] = useState("");
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [delOpen, setDelOpen] = useState(false);
  const [delPw, setDelPw] = useState("");

  useEffect(() => { if (!loading && !user) router.replace("/login?next=/account"); }, [loading, user, router]);
  useEffect(() => { if (user) { setName(user.name); setBio(user.bio || ""); } }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  if (loading || !user) return <div className="mx-auto max-w-2xl p-6"><Skeleton className="h-24 w-full" /><Skeleton className="mt-4 h-48 w-full" /></div>;

  const run = async (key, fn, okMsg) => {
    setBusy(key);
    try { await fn(); if (okMsg) toast.success(okMsg); } catch (e) { toast.error(e.message); } finally { setBusy(""); }
  };

  const pickAvatar = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!TYPES.includes(file.type)) return toast.error("Please choose a PNG, JPEG or WebP image");
    if (file.size > MAX_BYTES) return toast.error("Image is too large (max 2 MB)");
    setPreview(URL.createObjectURL(file));
    run("avatar", async () => {
      const fd = new FormData(); fd.append("file", file);
      const r = await api("/profile/avatar", { method: "POST", body: fd });
      setUser(r.user);
    }, "Profile picture updated").finally(() => setPreview(null));
  };

  const shown = preview ? { ...user, avatarUrl: preview } : user;
  const verifyAgain = () => run("verify", () => api("/auth/resend-verification", { method: "POST" }), "Verification email sent");

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Logo href="/dashboard" />
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <Button asChild variant="outline" size="sm"><Link href="/dashboard"><ArrowLeft /> Dashboard</Link></Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-2xl gap-5 px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Account settings</h1>

        <Card title="Profile" description="Your name and picture appear on notes you share and in collaborator lists.">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar user={shown} size={88} />
              {busy === "avatar" && <span className="absolute inset-0 grid place-items-center rounded-full bg-background/70"><Loader2 className="animate-spin" /></span>}
            </div>
            <div className="grid gap-2">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={busy === "avatar"}><Camera /> {user.avatarUrl ? "Change photo" : "Upload photo"}</Button>
                {user.avatarUrl && (
                  <Button variant="ghost" size="sm" disabled={busy === "avatar"} onClick={() => run("avatar", async () => { setUser((await api("/profile/avatar", { method: "DELETE" })).user); }, "Profile picture removed")}>Remove</Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">PNG, JPEG or WebP, up to 2 MB. It's cropped to a square.</p>
            </div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={pickAvatar} aria-label="Choose profile picture" />
          </div>

          <form className="mt-6 grid gap-4" onSubmit={(e) => { e.preventDefault(); run("profile", async () => setUser((await api("/profile", { method: "PATCH", body: { name, bio } })).user), "Profile saved"); }}>
            <div className="grid gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bio">Bio <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={280} rows={3}
                className="w-full resize-none rounded-lg border bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground" placeholder="A line about you" />
              <p className="text-right text-xs text-muted-foreground">{bio.length}/280</p>
            </div>
            <div><Button type="submit" disabled={busy === "profile" || (name === user.name && bio === (user.bio || ""))}><Spin show={busy === "profile"} />Save profile</Button></div>
          </form>
        </Card>

        <Card title="Email" description="Changing your email requires your password, and the new address must be verified again.">
          <p className="flex items-center gap-2 text-sm">
            {user.emailVerified ? <MailCheck className="size-4 text-primary" /> : <MailWarning className="size-4 text-amber-500" />}
            <span className="font-medium">{user.email}</span>
            <span className="text-muted-foreground">{user.emailVerified ? "Verified" : "Not verified"}</span>
            {!user.emailVerified && <button onClick={verifyAgain} className="text-primary underline cursor-pointer">Resend email</button>}
          </p>
          <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); run("email", async () => { setUser((await api("/profile/email", { method: "POST", body: { email, password: emailPw } })).user); setEmail(""); setEmailPw(""); }, "Email updated. Check your inbox to verify it."); }}>
            <div className="grid gap-1.5"><Label htmlFor="new-email">New email</Label><Input id="new-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></div>
            <div className="grid gap-1.5"><Label htmlFor="email-pw">Current password</Label><Input id="email-pw" type="password" value={emailPw} onChange={(e) => setEmailPw(e.target.value)} autoComplete="current-password" required /></div>
            <div className="sm:col-span-2"><Button type="submit" variant="outline" disabled={busy === "email"}><Spin show={busy === "email"} />Change email</Button></div>
          </form>
        </Card>

        <Card title="Password">
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => {
            e.preventDefault();
            if (pw.next !== pw.confirm) return toast.error("New passwords don't match");
            run("password", async () => { await api("/profile/password", { method: "POST", body: { currentPassword: pw.current, newPassword: pw.next } }); setPw({ current: "", next: "", confirm: "" }); }, "Password changed");
          }}>
            <div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="cur-pw">Current password</Label><Input id="cur-pw" type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" required /></div>
            <div className="grid gap-1.5"><Label htmlFor="new-pw">New password (8+ characters)</Label><Input id="new-pw" type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" minLength={8} required /></div>
            <div className="grid gap-1.5"><Label htmlFor="conf-pw">Confirm new password</Label><Input id="conf-pw" type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" minLength={8} required /></div>
            <div className="sm:col-span-2"><Button type="submit" variant="outline" disabled={busy === "password"}><Spin show={busy === "password"} />Change password</Button></div>
          </form>
        </Card>

        <Card title="Delete account" description="Permanently deletes your account, all notes you own, their versions and attachments. This can't be undone.">
          <Button variant="destructive" onClick={() => setDelOpen(true)}><Trash2 /> Delete my account</Button>
        </Card>
      </main>

      <Dialog open={delOpen} onOpenChange={(o) => { setDelOpen(o); if (!o) setDelPw(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>Everything you own will be erased immediately. Enter your password to confirm.</DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); run("delete", async () => { await api("/profile", { method: "DELETE", body: { password: delPw } }); setUser(null); router.push("/"); }, "Account deleted"); }}>
            <Input type="password" value={delPw} onChange={(e) => setDelPw(e.target.value)} placeholder="Your password" autoComplete="current-password" aria-label="Password to confirm" required />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDelOpen(false)}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={busy === "delete"}><Spin show={busy === "delete"} />Delete forever</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
