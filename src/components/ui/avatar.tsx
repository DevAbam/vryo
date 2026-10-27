import { cn } from "@/lib/cn";
import { publicEnv } from "@/lib/env/public";
import { imageUrl } from "@/lib/media/image-url";

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
const pixels = { sm: 32, md: 40, lg: 80 } as const;

/** Profile photo served from ImageKit, falling back to coloured initials. */
export function Avatar({
  name,
  seed,
  path,
  size = "md",
  className,
}: {
  name: string;
  seed: string;
  path?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const endpoint = publicEnv().NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
  const px = pixels[size];
  const src = path && endpoint ? imageUrl(endpoint, path, { width: px, height: px }) : null;
  const src2x =
    path && endpoint ? imageUrl(endpoint, path, { width: px * 2, height: px * 2 }) : null;

  if (src && src2x) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- ImageKit resizes on its CDN; next/image would optimise twice.
      <img
        src={src}
        srcSet={`${src} 1x, ${src2x} 2x`}
        alt=""
        width={px}
        height={px}
        loading="lazy"
        decoding="async"
        className={cn("shrink-0 rounded-full bg-surface-2 object-cover", sizes[size], className)}
      />
    );
  }

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
