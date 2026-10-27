import type { Metadata } from "next";
import Link from "next/link";
import { ResetRequestForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <>
      <div className="flex flex-col gap-2 text-center lg:text-left">
        <h1 className="text-2xl font-extrabold tracking-tight">Reset your password</h1>
        <p className="text-sm text-muted">We&apos;ll email you a link to choose a new one.</p>
      </div>
      <ResetRequestForm />
      <Link href="/login" className="self-center text-sm text-muted hover:text-fg">
        Back to sign in
      </Link>
    </>
  );
}
