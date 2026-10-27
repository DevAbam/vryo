import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { OnboardingForm } from "@/components/auth/auth-forms";
import { Skeleton } from "@/components/ui/primitives";
import { findProfileById } from "@/server/repositories/profiles";
import { requireUser } from "@/server/services/auth";

export const metadata: Metadata = { title: "Set up your profile" };

export default function OnboardingPage() {
  return (
    <>
      <div className="flex flex-col gap-2 text-center lg:text-left">
        <h1 className="text-2xl font-extrabold tracking-tight">Set up your profile</h1>
        <p className="text-sm text-muted">Pick a handle so other fans can find you.</p>
      </div>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <Onboarding />
      </Suspense>
    </>
  );
}

function suggestHandle(displayName: string) {
  const base = displayName
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20);
  return base.length >= 3 ? base : "";
}

async function Onboarding() {
  const user = await requireUser();
  const profile = await findProfileById(user.id);
  if (!profile) redirect("/login");
  if (profile.handle) redirect("/feed");
  return <OnboardingForm suggestedHandle={suggestHandle(profile.display_name)} />;
}
