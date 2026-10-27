import { cn } from "@/lib/cn";

// Muted backgrounds behind white initials, like the inspo's avatar chips.
// Every pairing keeps white text above 4.5:1.
const PALETTE = ["#3b4a6b", "#6b2f3a", "#2f5d50", "#5a3f73", "#7a4a1f", "#30586e"];

function pick(seed: string) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2);
  return letters.toUpperCase() || "?";
}

const sizes = { sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-20 text-2xl" } as const;

/** Initials avatar. Uploaded avatars arrive with the media phase. */
export function Avatar({
  name,
  seed,
  size = "md",
  className,
}: {
  name: string;
  seed: string;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white select-none",
        sizes[size],
        className,
      )}
      style={{ backgroundColor: pick(seed) }}
    >
      {initials(name)}
    </span>
  );
}
