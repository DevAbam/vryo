import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { PageBodySkeleton } from "@/components/shell/placeholder";
import { ProfileForm, SessionControls } from "@/components/profile/settings-forms";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { requireViewer } from "@/server/services/profile";

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
  const { user, profile } = await requireViewer();
  return (
    <div className="flex flex-col gap-6">
      <Card className="p-4 sm:p-6">
        <h2 className="mb-4 text-base font-bold text-fg">Profile</h2>
        <ProfileForm
          initial={{ handle: profile.handle, displayName: profile.display_name, bio: profile.bio }}
        />
      </Card>

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
