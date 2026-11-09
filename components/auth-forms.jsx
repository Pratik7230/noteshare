"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/components/auth-card";
import { api, safeNext } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";

function Field({ id, label, ...props }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} {...props} />
    </div>
  );
}
const Submit = ({ busy, children }) => (
  <Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 className="animate-spin" />}{children}</Button>
);

function useSubmit(fn) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try { await fn(Object.fromEntries(new FormData(e.currentTarget))); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return { busy, error, submit };
}
const ErrorText = ({ error }) => (error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null);

function LoginInner() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const { refresh } = useAuth();
  const { busy, error, submit } = useSubmit(async (v) => {
    await api("/auth/login", { method: "POST", body: v });
    await refresh();
    router.push(next);
  });
  return (
    <AuthCard title="Welcome back" subtitle="Log in to see your notes."
      footer={<>New here? <Link href={`/register?next=${encodeURIComponent(next)}`} className="text-primary underline">Create an account</Link></>}>
      <form onSubmit={submit} className="grid gap-4">
        <Field id="email" label="Email" type="email" autoComplete="email" required />
        <Field id="password" label="Password" type="password" autoComplete="current-password" required />
        <ErrorText error={error} />
        <Submit busy={busy}>Log in</Submit>
        <Link href="/forgot-password" className="text-center text-sm text-muted-foreground underline">Forgot your password?</Link>
      </form>
    </AuthCard>
  );
}
export const LoginForm = () => <Suspense><LoginInner /></Suspense>;

function RegisterInner() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const { refresh } = useAuth();
  const { busy, error, submit } = useSubmit(async (v) => {
    await api("/auth/register", { method: "POST", body: v });
    await refresh();
    toast.success("Account created. Check your email to verify it.");
    router.push(next);
  });
  return (
    <AuthCard title="Create your account" subtitle="Notes you made as a guest on this device will be added to it."
      footer={<>Already have an account? <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-primary underline">Log in</Link></>}>
      <form onSubmit={submit} className="grid gap-4">
        <Field id="name" label="Name" autoComplete="name" required maxLength={120} />
        <Field id="email" label="Email" type="email" autoComplete="email" required />
        <Field id="password" label="Password (8+ characters)" type="password" autoComplete="new-password" required minLength={8} />
        <ErrorText error={error} />
        <Submit busy={busy}>Sign up</Submit>
      </form>
    </AuthCard>
  );
}
export const RegisterForm = () => <Suspense><RegisterInner /></Suspense>;

export function ForgotForm() {
  const [sent, setSent] = useState(false);
  const { busy, error, submit } = useSubmit(async (v) => { await api("/auth/forgot-password", { method: "POST", body: v }); setSent(true); });
  return (
    <AuthCard title="Reset your password" subtitle="We'll email you a link."
      footer={<Link href="/login" className="text-primary underline">Back to log in</Link>}>
      {sent ? (
        <p className="text-sm">If an account exists for that email, a reset link is on its way. It's valid for one hour.</p>
      ) : (
        <form onSubmit={submit} className="grid gap-4">
          <Field id="email" label="Email" type="email" autoComplete="email" required />
          <ErrorText error={error} />
          <Submit busy={busy}>Send reset link</Submit>
        </form>
      )}
    </AuthCard>
  );
}

function ResetInner() {
  const router = useRouter();
  const token = useSearchParams().get("token") || "";
  const { busy, error, submit } = useSubmit(async (v) => {
    await api("/auth/reset-password", { method: "POST", body: { token, password: v.password } });
    toast.success("Password updated. Log in with your new password.");
    router.push("/login");
  });
  return (
    <AuthCard title="Choose a new password">
      <form onSubmit={submit} className="grid gap-4">
        <Field id="password" label="New password (8+ characters)" type="password" autoComplete="new-password" required minLength={8} />
        <ErrorText error={error} />
        <Submit busy={busy}>Update password</Submit>
      </form>
    </AuthCard>
  );
}
export const ResetForm = () => <Suspense><ResetInner /></Suspense>;

function VerifyInner() {
  const token = useSearchParams().get("token") || "";
  const [state, setState] = useState("working");
  const { refresh } = useAuth();
  useEffect(() => {
    api("/auth/verify-email", { method: "POST", body: { token } }).then(() => { setState("ok"); refresh(); }).catch(() => setState("bad"));
  }, [token, refresh]);
  return (
    <AuthCard title="Email verification">
      {state === "working" && <p className="flex items-center gap-2 text-sm"><Loader2 className="size-4 animate-spin" /> Verifying…</p>}
      {state === "ok" && <p className="text-sm">Your email is verified. <Link href="/dashboard" className="text-primary underline">Go to your notes</Link></p>}
      {state === "bad" && <p className="text-sm text-destructive">This verification link is invalid or was already used.</p>}
    </AuthCard>
  );
}
export const VerifyEmail = () => <Suspense><VerifyInner /></Suspense>;

export function AcceptInvite({ token }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [state, setState] = useState({ status: "idle", message: "" });

  useEffect(() => {
    if (loading || !user) return;
    setState({ status: "working", message: "" });
    api("/invitations/accept", { method: "POST", body: { token } })
      .then(({ slug }) => router.replace(`/n/${slug}`))
      .catch((e) => setState({ status: "error", message: e.message }));
  }, [loading, user, token, router]);

  if (!loading && !user) {
    const next = encodeURIComponent(`/invite/${token}`);
    return (
      <AuthCard title="You've been invited to a note" subtitle="Log in or create an account with the email the invite was sent to.">
        <div className="grid gap-2">
          <Button asChild><Link href={`/login?next=${next}`}>Log in</Link></Button>
          <Button asChild variant="outline"><Link href={`/register?next=${next}`}>Create account</Link></Button>
        </div>
      </AuthCard>
    );
  }
  return (
    <AuthCard title="Opening note…">
      {state.status === "error" ? <p role="alert" className="text-sm text-destructive">{state.message}</p> : <Loader2 className="size-5 animate-spin" />}
    </AuthCard>
  );
}
