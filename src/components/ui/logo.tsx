import Link from "next/link";
import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-7 shrink-0", className)}>
      <rect width="32" height="32" rx="9" fill="var(--color-lime)" />
      <path d="M8 9.5h4.2l3.8 9.4 3.8-9.4H24l-6.1 13h-3.8z" fill="var(--color-on-lime)" />
    </svg>
  );
}

/** VYRO wordmark. `compact` shows the mark only (icon rail). */
export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link
      href="/feed"
      aria-label="VYRO home"
      className={cn("inline-flex items-center gap-2 rounded-lg", className)}
    >
      <LogoMark />
      {!compact && <span className="text-xl font-black tracking-[0.12em] text-fg">VYRO</span>}
    </Link>
  );
}
