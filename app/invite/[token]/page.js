import { AcceptInvite } from "@/components/auth-forms";
export const metadata = { title: "Invitation", robots: { index: false } };
export default async function Page({ params }) { const { token } = await params; return <AcceptInvite token={token} />; }
