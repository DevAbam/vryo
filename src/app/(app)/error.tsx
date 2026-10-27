"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="px-4 py-8">
      <EmptyState
        title="Something went wrong"
        action={
          <Button variant="secondary" onClick={reset}>
            Try again
          </Button>
        }
      >
        We couldn&apos;t load this page. Check your connection and try again.
      </EmptyState>
    </div>
  );
}
