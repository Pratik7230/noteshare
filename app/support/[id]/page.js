import TicketThread from "@/components/support/ticket-thread";
export const metadata = { title: "Support ticket" };
export default async function Page({ params }) { const { id } = await params; return <TicketThread id={id} />; }
