import SupportShell from "@/components/support/support-shell";

export const metadata = { title: "Support", robots: { index: false, follow: false } };
export default function SupportLayout({ children }) { return <SupportShell>{children}</SupportShell>; }
