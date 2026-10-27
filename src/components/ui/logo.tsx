import Link from "next/link";
import { cn } from "@/lib/cn";

// Vector trace of the VYRO brand mark (public/brand/vyro-mark.jpg): a ball
// "drop" above a check-like V. Shared with src/app/icon.svg; keep in sync.
export const LOGO_VIEWBOX = "330 398 592 460";
export const LOGO_DROP_PATH =
  "M421 409H566L493 528C478 553 452 570 421 570A80.5 80.5 0 0 1 421 409Z";
export const LOGO_V_PATH =
  "M425 658C452 684 476 698 505 698C534 698 560 685 577 660L705 448C720 424 745 408 772 408H912L665 806C649 832 622 848 592 848C562 848 535 832 519 806Z";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      aria-hidden="true"
      className={cn("h-7 w-auto shrink-0", className)}
      fill="var(--color-lime)"
    >
      <path d={LOGO_DROP_PATH} />
      <path d={LOGO_V_PATH} />
    </svg>
  );
}

/** VYRO mark + wordmark. `compact` shows the mark only (icon rail). */
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
