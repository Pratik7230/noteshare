import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <p className="text-sm font-medium text-primary">404</p>
        <h1 className="mt-2 text-3xl font-bold">Page not found</h1>
        <p className="mt-2 text-muted-foreground">That page doesn't exist.</p>
        <Button asChild className="mt-6"><Link href="/">Go home</Link></Button>
      </div>
    </main>
  );
}
