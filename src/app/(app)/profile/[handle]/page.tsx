import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { PageBodySkeleton } from "@/components/shell/placeholder";
import { Avatar } from "@/components/ui/avatar";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { handleSchema } from "@/lib/validation/profile";
import { findProfileByHandle } from "@/server/repositories/profiles";
import { requireViewer } from "@/server/services/profile";
import { isAdmin } from "@/server/services/verification";
import { ToggleVerifiedButton } from "@/components/verification/verification-forms";

export const metadata: Metadata = { title: "Profile" };

const joinedFormat = new Intl.DateTimeFormat("en", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export default function ProfilePage({ params }: PageProps<"/profile/[handle]">) {
  return (
    <>
      <PageHeader title="Profile" />
      <Suspense
        fallback={
          <div className="px-4 py-4">
            <PageBodySkeleton />
          </div>
        }
      >
        <ProfileBody params={params} />
      </Suspense>
    </>
  );
}

async function ProfileBody({ params }: { params: Promise<{ handle: string }> }) {
  const viewer = await requireViewer();
  const parsed = handleSchema.safeParse(decodeURIComponent((await params).handle));
  if (!parsed.success) notFound();

  const profile = await findProfileByHandle(parsed.data);
  if (!profile?.handle) notFound();
  const isOwn = profile.id === viewer.profile.id;
  const admin = await isAdmin();

  return (
    <div className="flex flex-col gap-6 px-4 py-4">
      <section aria-labelledby="profile-name" className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <Avatar
            name={profile.display_name}
            seed={profile.id}
            path={profile.avatar_path}
            size="lg"
          />
          {isOwn && (
            <LinkButton href="/settings" variant="secondary" size="sm">
              Edit profile
            </LinkButton>
          )}
        </div>
        <div>
          <h2
            id="profile-name"
            className="flex items-center gap-1.5 text-xl font-extrabold text-fg"
          >
            <span className="min-w-0 break-words">{profile.display_name}</span>
            {profile.verified_at && <VerifiedBadge />}
          </h2>
          <p className="text-sm text-muted">@{profile.handle}</p>
        </div>
        {profile.bio && (
          <p className="text-[0.9375rem] whitespace-pre-line text-fg">{profile.bio}</p>
        )}
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <CalendarDays aria-hidden="true" className="size-4" />
          Joined {joinedFormat.format(new Date(profile.created_at))}
        </p>
      </section>

      {admin && (
        <section
          aria-label="Admin"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-lime/40 p-3"
        >
          <p className="text-sm text-muted">
            Admin · {profile.verified_at ? "Verified account" : "Not verified"}
          </p>
          <ToggleVerifiedButton handle={profile.handle} verified={Boolean(profile.verified_at)} />
        </section>
      )}

      <EmptyState title={isOwn ? "You haven't posted yet" : "No posts yet"}>
        Posts will appear here once posting opens.
      </EmptyState>
    </div>
  );
}
