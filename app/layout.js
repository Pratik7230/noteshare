import "./globals.css";
import Script from "next/script";
import Providers from "@/components/providers";

export const metadata = {
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  title: { default: "NoteShare: Write. Save. Share.", template: "%s | NoteShare" },
  description: "A fast online notepad. Write instantly, share with a link, protect with a password. No account needed.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "NoteShare" },
  icons: { icon: "/noteshare.svg", apple: "/noteshare.svg" },
  openGraph: { title: "NoteShare", description: "Write. Save. Share.", type: "website" },
};
export const viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f6f7fb" }, { media: "(prefers-color-scheme: dark)", color: "#0f131b" }],
};

const themeScript = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="theme-script" strategy="beforeInteractive">
          {themeScript}
        </Script>
      </head>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
