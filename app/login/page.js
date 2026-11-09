import { LoginForm } from "@/components/auth-forms";
import FallingLeaves from "@/components/falling-leaves";
export const metadata = { title: "Log in" };
export default function Page() {
    return <>
        <FallingLeaves fullScreen shapes={['maple']} />
        <LoginForm />
    </>;
}
