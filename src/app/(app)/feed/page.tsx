import type { Metadata } from "next";
import { Suspense } from "react";
import { House } from "lucide-react";
import { SportChips } from "@/components/shell/nav-links";
import { UpcomingSection } from "@/components/shell/placeholder";
import { Skeleton } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Feed" };

export default function FeedPage() {
  return (
    <UpcomingSection
      title="Feed"
      tabbed
      icon={<House aria-hidden="true" className="size-6" />}
      heading="Your feed is warming up"
      toolbar={
        <div className="px-4 pt-3">
          <Suspense fallback={<Skeleton className="h-8 w-64 rounded-full" />}>
            <SportChips />
          </Suspense>
        </div>
      }
    >
      Takes, match threads and posts from people you follow will land here. Posting opens in the
      next release.
    </UpcomingSection>
  );
}
