import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { PageBodySkeleton } from "@/components/shell/placeholder";
import { Avatar } from "@/components/ui/avatar";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { handleSchema } from "@/lib/validation/profile";
import { findProfileByHandle } from "@/server/repositories/profiles";
import { requireViewer } from "@/server/services/profile";

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

  return (
    <div className="flex flex-col gap-6 px-4 py-4">
      <section aria-labelledby="profile-name" className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <Avatar name={profile.display_name} seed={profile.id} size="lg" />
          {isOwn && (
            <LinkButton href="/settings" variant="secondary" size="sm">
              Edit profile
            </LinkButton>
          )}
        </div>
        <div>
          <h2 id="profile-name" className="text-xl font-extrabold text-fg">
            {profile.display_name}
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

      <EmptyState title={isOwn ? "You haven't posted yet" : "No posts yet"}>
        Posts will appear here once posting opens.
      </EmptyState>
    </div>
  );
}
