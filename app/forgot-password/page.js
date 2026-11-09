import { ForgotForm } from "@/components/auth-forms";
import FallingLeaves from "@/components/falling-leaves";
export const metadata = { title: "Forgot password" };
export default function Page() {
    return <>
        <FallingLeaves fullScreen shapes={['maple']} />
        <ForgotForm />
    </>;
}
