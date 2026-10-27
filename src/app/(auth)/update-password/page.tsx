import type { Metadata } from "next";
import { Suspense } from "react";
import { UpdatePasswordForm } from "@/components/auth/auth-forms";
import { Skeleton } from "@/components/ui/primitives";
import { requireUser } from "@/server/services/auth";

export const metadata: Metadata = { title: "Choose a new password" };

export default function UpdatePasswordPage() {
  return (
    <>
      <div className="flex flex-col gap-2 text-center lg:text-left">
        <h1 className="text-2xl font-extrabold tracking-tight">Choose a new password</h1>
      </div>
      <Suspense fallback={<Skeleton className="h-56 w-full" />}>
        <SignedIn>
          <UpdatePasswordForm />
        </SignedIn>
      </Suspense>
    </>
  );
}

async function SignedIn({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <>{children}</>;
}
