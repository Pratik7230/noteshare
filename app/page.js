import { FileClock, History, KeyRound, Link2, Lock, PenLine, QrCode, ShieldCheck, Timer, Users, Download } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { StartWritingButton, TemplateCard } from "@/components/start-writing";
import { Logo } from "@/components/logo";

const features = [
  { icon: PenLine, title: "Rich, Markdown or plain", text: "Headings, tables, checklists, code blocks with highlighting, and a live Markdown preview." },
  { icon: Link2, title: "Short links, custom names", text: "Every note gets a link you can share. Pick your own address like /n/launch-plan." },
  { icon: Lock, title: "Privacy controls", text: "Public, unlisted or private. Add a password, make it read-only, or cap the number of views." },
  { icon: Timer, title: "Self-destructing notes", text: "Set a note to expire in an hour, a day, a week, or on a date you choose." },
  { icon: History, title: "Version history", text: "Browse older versions and restore any of them in one click." },
  { icon: Users, title: "Share with people", text: "Invite collaborators by email with view or edit access." },
  { icon: Download, title: "Export and import", text: "Download as TXT, Markdown, HTML or PDF. Import your existing files." },
  { icon: QrCode, title: "QR codes", text: "Hand a note to your phone by scanning a code." },
];

const templates = [
  { id: "meeting", name: "Meeting Notes", hint: "Agenda, discussion, action items", icon: "CalendarCheck" },
  { id: "journal", name: "Daily Journal", hint: "Gratitude, highlights, lessons", icon: "BookOpen" },
  { id: "todo", name: "To-do List", hint: "A clean checklist", icon: "ListChecks" },
  { id: "project", name: "Project Documentation", hint: "Overview, setup, roadmap", icon: "FileText" },
  { id: "snippets", name: "Code Snippets", hint: "Highlighted code blocks", icon: "Code2" },
  { id: "study", name: "Study Notes", hint: "Concepts, summary, review", icon: "GraduationCap" },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="mx-auto max-w-4xl px-4 pb-16 pt-16 text-center sm:pt-24">
          <p className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary" /> No account needed
          </p>
          <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">Write. Save. Share.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            A fast, distraction-free notepad in your browser. Start typing, get a link, and share it with anyone.
            Sign up later if you want a dashboard, collaborators and version history.
          </p>
          <div className="mt-8 flex justify-center"><StartWritingButton /></div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="features">
          <h2 id="features" className="text-2xl font-bold">Everything a notepad should do</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border bg-card p-5 shadow-sm">
                <f.icon className="size-5 text-primary" />
                <h3 className="mt-3 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="how">
          <h2 id="how" className="text-2xl font-bold">How it works</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {[["1", "Start writing", "Press the button. A new note opens instantly with its own link."], ["2", "It saves itself", "Every change is saved automatically. Come back to the same link any time."], ["3", "Share it", "Copy the link or scan the QR code. Choose who can view or edit."]].map(([n, t, d]) => (
              <li key={n} className="flex gap-4 rounded-xl border bg-card p-5 shadow-sm">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary font-semibold text-primary-foreground">{n}</span>
                <div><h3 className="font-semibold">{t}</h3><p className="mt-1 text-sm text-muted-foreground">{d}</p></div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="templates">
          <h2 id="templates" className="text-2xl font-bold">Start from a template</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => <TemplateCard key={t.id} {...t} />)}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="privacy">
          <div className="rounded-2xl border bg-card p-8 shadow-sm">
            <h2 id="privacy" className="flex items-center gap-2 text-2xl font-bold"><ShieldCheck className="size-6 text-primary" /> Privacy and security</h2>
            <ul className="mt-5 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
              <li className="flex gap-2"><KeyRound className="mt-0.5 size-4 shrink-0 text-primary" /> Passwords are hashed with bcrypt and checked on the server. Note passwords never reach your browser.</li>
              <li className="flex gap-2"><Lock className="mt-0.5 size-4 shrink-0 text-primary" /> Sessions use secure, HTTP-only cookies. Private notes are only served to their owner.</li>
              <li className="flex gap-2"><FileClock className="mt-0.5 size-4 shrink-0 text-primary" /> Expired notes are deleted automatically. Deleted notes stay in Trash for 30 days, then they're gone.</li>
              <li className="flex gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" /> Note content is sanitized to block scripts, and view stats never store your IP address.</li>
            </ul>
          </div>
        </section>
      </main>
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row">
          <Logo />
          <p>Write. Save. Share. © {new Date().getFullYear()} NoteShare</p>
        </div>
      </footer>
    </>
  );
}
