import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-[var(--radius-card)] border border-line bg-surface", className)}
      {...props}
    />
  );
}

/** Red LIVE pill. Text plus colour, so state never relies on colour alone. */
export function LiveBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded bg-live px-1.5 py-0.5 text-[0.6875rem] font-extrabold tracking-wide text-white",
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-white" />
      LIVE
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("animate-pulse rounded-lg bg-surface-2", className)} />
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-dashed border-line px-6 py-12 text-center",
        className,
      )}
    >
      {icon && (
        <div className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-lime">
          {icon}
        </div>
      )}
      <h2 className="text-base font-semibold text-fg">{title}</h2>
      {children && <div className="max-w-sm text-sm text-muted">{children}</div>}
      {action}
    </div>
  );
}

export function SectionHeading({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-sm font-bold text-fg">{children}</h2>
      {action}
    </div>
  );
}
