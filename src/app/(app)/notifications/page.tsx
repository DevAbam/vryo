import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { UpcomingSection } from "@/components/shell/placeholder";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <UpcomingSection
      title="Notifications"
      icon={<Bell aria-hidden="true" className="size-6" />}
      heading="You're all caught up"
    >
      Likes, replies, follows and space invites will show up here.
    </UpcomingSection>
  );
}
