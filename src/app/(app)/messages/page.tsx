import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { UpcomingSection } from "@/components/shell/placeholder";

export const metadata: Metadata = { title: "Messages" };

export default function MessagesPage() {
  return (
    <UpcomingSection
      title="Messages"
      icon={<Mail aria-hidden="true" className="size-6" />}
      heading="No conversations yet"
    >
      Direct and group chats with other fans are coming soon.
    </UpcomingSection>
  );
}
