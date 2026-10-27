import type { Metadata } from "next";
import { Search } from "lucide-react";
import { UpcomingSection } from "@/components/shell/placeholder";

export const metadata: Metadata = { title: "Search" };

export default function SearchPage() {
  return (
    <UpcomingSection
      title="Search"
      icon={<Search aria-hidden="true" className="size-6" />}
      heading="Search is coming soon"
    >
      Find fans, teams, matches and spaces from one place.
    </UpcomingSection>
  );
}
