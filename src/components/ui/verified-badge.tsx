import { cn } from "@/lib/cn";

/** Brand-green verified seal shown next to a verified account's name. */
export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label="Verified account"
      className={cn("inline-block size-[1.1em] shrink-0 align-[-0.15em]", className)}
    >
      <title>Verified account</title>
      <path
        fill="var(--color-lime)"
        d="M12 1.5l2.4 1.8 3-.2 1 2.8 2.6 1.5-.6 2.9 1.4 2.7-2 2.2.1 3-2.9.8-1.6 2.5-2.9-.9L12 22.5l-2.5-1.9-2.9.9L5 19l-2.9-.8.1-3-2-2.2 1.4-2.7-.6-2.9 2.6-1.5 1-2.8 3 .2z"
      />
      <path
        fill="none"
        stroke="var(--color-on-lime)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.6 12.3l3 3 5.8-6.2"
      />
    </svg>
  );
}
