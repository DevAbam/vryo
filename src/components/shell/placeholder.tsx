import { Suspense, type ReactNode } from "react";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { requireViewer } from "@/server/services/profile";
import { PageHeader } from "./page-header";

/** Signed-in gate for app pages. Redirects to login or onboarding as needed. */
export async function ViewerGate({ children }: { children: ReactNode }) {
  await requireViewer();
  return <>{children}</>;
}

export function PageBodySkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  );
}

/**
 * Honest placeholder for a pillar whose backend ships in a later phase.
 * No demo data and no controls that pretend to work.
 */
export function UpcomingSection({
  title,
  tabbed,
  icon,
  heading,
  children,
  toolbar,
}: {
  title: string;
  tabbed?: boolean;
  icon: ReactNode;
  heading: string;
  children: ReactNode;
  toolbar?: ReactNode;
}) {
  return (
    <>
      <PageHeader title={title} tabbed={tabbed} />
      {toolbar}
      <div className="px-4 py-4">
        <Suspense fallback={<PageBodySkeleton />}>
          <ViewerGate>
            <EmptyState icon={icon} title={heading}>
              {children}
            </EmptyState>
          </ViewerGate>
        </Suspense>
      </div>
    </>
  );
}
