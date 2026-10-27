import type { Metadata } from "next";
import { MonitorPlay } from "lucide-react";
import { UpcomingSection } from "@/components/shell/placeholder";

export const metadata: Metadata = { title: "Stream" };

export default function StreamPage() {
  return (
    <UpcomingSection
      title="Stream"
      tabbed
      icon={<MonitorPlay aria-hidden="true" className="size-6" />}
      heading="No matches to show yet"
    >
      Live matches, schedules and watch-alongs appear here once our licensed streaming partner is
      connected.
    </UpcomingSection>
  );
}
