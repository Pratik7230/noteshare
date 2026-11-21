import TicketDetail from "@/components/admin/ticket-detail";
export const metadata = { title: "Admin: Ticket" };
export default async function Page({ params }) { const { id } = await params; return <TicketDetail id={id} />; }
