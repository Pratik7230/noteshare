"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, FileText, Flag, HardDrive, LayoutDashboard, ScrollText, Settings, ShieldAlert, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/avatar";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/notes", label: "Notes", icon: FileText },
  { href: "/admin/reports", label: "Reports", icon: Flag, badge: true },
  { href: "/admin/storage", label: "Storage", icon: HardDrive },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminShell({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const [open, setOpen] = useState(0);
  const isAdmin = user?.role === "admin";

  useEffect(() => { if (!loading && !user) router.replace("/login?next=/admin"); }, [loading, user, router]);
  useEffect(() => { if (isAdmin) api("/admin/reports?status=open").then((r) => setOpen(r.total)).catch(() => {}); }, [isAdmin, path]);

  if (loading || !user) return <div className="p-6"><Skeleton className="h-8 w-48" /><Skeleton className="mt-6 h-64 w-full" /></div>;
  if (!isAdmin) {
    return (
      <main className="grid min-h-dvh place-items-center p-6 text-center">
        <div>
          <ShieldAlert className="mx-auto size-10 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-bold">Admins only</h1>
          <p className="mt-2 text-muted-foreground">Your account doesn't have access to the admin panel.</p>
          <Button asChild className="mt-6"><Link href="/dashboard">Back to dashboard</Link></Button>
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-4">
          <div className="flex items-center gap-3"><Logo href="/admin" /><span className="rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">Admin</span></div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="outline" size="sm"><Link href="/dashboard">Exit admin</Link></Button>
            <Avatar user={user} size={32} />
          </div>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 md:flex-row">
        <nav aria-label="Admin sections" className="flex shrink-0 gap-1 overflow-x-auto md:w-52 md:flex-col">
          {NAV.map((n) => {
            const active = n.exact ? path === n.href : path.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined}
                className={cn("flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted", active ? "bg-accent text-primary" : "text-muted-foreground")}>
                <n.icon className="size-4" /> {n.label}
                {n.badge && open > 0 && <span className="ml-auto rounded-full bg-destructive px-1.5 text-xs font-semibold text-white">{open}</span>}
              </Link>
            );
          })}
        </nav>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
