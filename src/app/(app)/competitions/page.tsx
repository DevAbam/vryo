import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import { UpcomingSection } from "@/components/shell/placeholder";

export const metadata: Metadata = { title: "Competitions" };

export default function CompetitionsPage() {
  return (
    <UpcomingSection
      title="Competitions"
      icon={<Trophy aria-hidden="true" className="size-6" />}
      heading="Leagues and fixtures are on the way"
    >
      Tables, fixtures and results arrive with match data from our streaming partner.
    </UpcomingSection>
  );
}
