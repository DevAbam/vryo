import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { PageBodySkeleton } from "@/components/shell/placeholder";
import { AvatarForm } from "@/components/profile/avatar-form";
import { ProfileForm, SessionControls } from "@/components/profile/settings-forms";
import { Avatar } from "@/components/ui/avatar";
import { VerificationCard } from "@/components/verification/verification-card";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { imagekitConfigured } from "@/server/providers/media/imagekit";
import { requireViewer } from "@/server/services/profile";
import { isAdmin } from "@/server/services/verification";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />
      <div className="px-4 py-4">
        <Suspense fallback={<PageBodySkeleton />}>
          <SettingsBody />
        </Suspense>
      </div>
    </>
  );
}

async function SettingsBody() {
  const viewer = await requireViewer();
  const { user, profile } = viewer;
  const admin = await isAdmin();
  return (
    <div className="flex flex-col gap-6">
      <Card className="p-4 sm:p-6">
        <h2 className="mb-4 text-base font-bold text-fg">Profile</h2>
        {imagekitConfigured() && (
          <div className="mb-6 border-b border-line pb-6">
            <AvatarForm
              hasAvatar={Boolean(profile.avatar_path)}
              current={
                <Avatar
                  name={profile.display_name}
                  seed={profile.id}
                  path={profile.avatar_path}
                  size="lg"
                />
              }
            />
          </div>
        )}
        <ProfileForm
          initial={{ handle: profile.handle, displayName: profile.display_name, bio: profile.bio }}
        />
      </Card>

      <VerificationCard viewer={viewer} />

      {admin && (
        <Card className="flex flex-col gap-3 p-4 sm:p-6">
          <h2 className="text-base font-bold text-fg">Admin tools</h2>
          <p className="text-sm text-muted">Review verification requests and manage badges.</p>
          <div>
            <LinkButton href="/admin/verification" variant="secondary">
              Open verification queue
            </LinkButton>
          </div>
        </Card>
      )}

      <Card className="flex flex-col gap-4 p-4 sm:p-6">
        <h2 className="text-base font-bold text-fg">Account &amp; security</h2>
        <dl className="text-sm">
          <dt className="text-muted">Email</dt>
          <dd className="text-fg">{user.email ?? "Not available"}</dd>
        </dl>
        <div>
          <LinkButton href="/update-password" variant="secondary">
            Change password
          </LinkButton>
        </div>
        <SessionControls />
      </Card>
    </div>
  );
}
