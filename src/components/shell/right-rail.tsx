import { AudioLines, MonitorPlay } from "lucide-react";
import { Card, SectionHeading } from "@/components/ui/primitives";

/**
 * Live-context rail for laptop/desktop. Filled with real match and space data
 * once those phases land; until then it states plainly that nothing is live.
 */
export function RightRail() {
  return (
    <aside
      aria-label="Live now"
      className="sticky top-0 hidden h-dvh w-80 shrink-0 flex-col gap-4 overflow-y-auto py-4 lg:flex desk:w-96"
    >
      <Card className="flex flex-col gap-3 p-4">
        <SectionHeading>Live matches</SectionHeading>
        <div className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
          <MonitorPlay aria-hidden="true" className="size-5 shrink-0 text-lime" />
          <p className="text-sm text-muted">No matches are live right now.</p>
        </div>
      </Card>
      <Card className="flex flex-col gap-3 p-4">
        <SectionHeading>Happening now</SectionHeading>
        <div className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
          <AudioLines aria-hidden="true" className="size-5 shrink-0 text-lime" />
          <p className="text-sm text-muted">No live spaces right now.</p>
        </div>
      </Card>
      <p className="px-1 text-xs text-subtle">VYRO · Football &amp; basketball, live.</p>
    </aside>
  );
}
