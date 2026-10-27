import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <>
      <div className="flex flex-col gap-2 text-center lg:text-left">
        <h1 className="text-2xl font-extrabold tracking-tight">Join VYRO</h1>
        <p className="text-sm text-muted">Live takes, watch-alongs and audio spaces with fans.</p>
      </div>
      <SignupForm />
      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-lime hover:text-lime-hover">
          Sign in
        </Link>
      </p>
    </>
  );
}
