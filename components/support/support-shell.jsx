"use client";
import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";

export default function SupportShell({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => { if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(path)}`); }, [loading, user, router, path]);

  if (loading || !user) return <div className="mx-auto max-w-3xl p-6"><Skeleton className="h-10 w-48" /><Skeleton className="mt-6 h-64 w-full" /></div>;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Logo href="/dashboard" />
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <Button asChild variant="outline" size="sm"><Link href="/dashboard"><ArrowLeft /> Dashboard</Link></Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
