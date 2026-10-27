import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/auth-forms";
import { Skeleton } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <div className="flex flex-col gap-2 text-center lg:text-left">
        <h1 className="text-2xl font-extrabold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted">Sign in to jump back into the match.</p>
      </div>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <LoginForm />
      </Suspense>
      <p className="text-center text-sm text-muted">
        New to VYRO?{" "}
        <Link href="/signup" className="font-semibold text-lime hover:text-lime-hover">
          Create an account
        </Link>
      </p>
    </>
  );
}
