import { RegisterForm } from "@/components/auth-forms";
import { FallingLeaves } from "@/components/falling-leaves";

export const metadata = { title: "Sign up" };

export default function Page() {
  return (
    <>
      <FallingLeaves fullScreen shapes={["maple"]} />
      <RegisterForm />
    </>
  );
}

