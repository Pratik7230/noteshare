import NoteEditor from "@/components/editor/note-editor";

export const metadata = { title: "Note", robots: { index: false, follow: false } };

export default async function NotePage({ params }) {
  const { slug } = await params;
  return <NoteEditor slug={slug.toLowerCase()} />;
}
