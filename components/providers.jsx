"use client";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "@/hooks/useAuth";
import { Announcement } from "@/components/announcement";

export default function Providers({ children }) {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return (
    <AuthProvider>
      <Announcement />
      {children}
      <Toaster position="bottom-right" richColors closeButton />
    </AuthProvider>
  );
}
