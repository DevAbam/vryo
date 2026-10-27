import type { Metadata } from "next";
import { AudioLines } from "lucide-react";
import { UpcomingSection } from "@/components/shell/placeholder";

export const metadata: Metadata = { title: "Spaces" };

export default function SpacesPage() {
  return (
    <UpcomingSection
      title="Spaces"
      tabbed
      icon={<AudioLines aria-hidden="true" className="size-6" />}
      heading="No live spaces right now"
    >
      Live audio rooms for post-match debates and tactics talk are coming soon.
    </UpcomingSection>
  );
}
