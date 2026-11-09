import { ResetForm } from "@/components/auth-forms";
import FallingLeaves from "@/components/falling-leaves";
export const metadata = { title: "Reset password" };
export default function Page() {
    return <>
        <FallingLeaves fullScreen shapes={['maple']} />
        <ResetForm />
    </>;
}
