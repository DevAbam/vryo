import { LogoMark } from "@/components/ui/logo";

/** Decorative pitch-line artwork for wide auth/landing layouts. */
export function PitchArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 260"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="10" y="10" width="380" height="240" rx="6" />
      <line x1="200" y1="10" x2="200" y2="250" />
      <circle cx="200" cy="130" r="38" />
      <circle cx="200" cy="130" r="2.5" fill="currentColor" />
      <rect x="10" y="70" width="60" height="120" />
      <rect x="10" y="100" width="22" height="60" />
      <rect x="330" y="70" width="60" height="120" />
      <rect x="368" y="100" width="22" height="60" />
      <path d="M70 105a28 28 0 0 1 0 50" />
      <path d="M330 105a28 28 0 0 0 0 50" />
    </svg>
  );
}

export function BrandPanel() {
  return (
    <div className="relative hidden overflow-hidden rounded-3xl border border-line bg-surface p-10 lg:flex lg:flex-col lg:justify-between">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -right-40 size-[28rem] rounded-full bg-lime/15 blur-3xl"
      />
      <div className="relative flex items-center gap-3">
        <LogoMark className="h-9" />
        <span className="text-2xl font-black tracking-[0.12em]">VYRO</span>
      </div>
      <PitchArt className="relative w-full text-lime/40" />
      <div className="relative flex flex-col gap-3">
        <p className="text-3xl font-extrabold tracking-tight text-balance text-fg desk:text-4xl">
          Every match. Every take. <span className="text-lime">Live.</span>
        </p>
        <p className="max-w-md text-muted">
          Football and basketball fans, together: live takes, watch-alongs, audio spaces and chat.
        </p>
      </div>
    </div>
  );
}
