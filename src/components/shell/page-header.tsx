import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Page title bar. Section pages (Feed/Stream/Spaces) pass `tabbed` because
 * the section tabs already name the page below `lg`.
 */
export function PageHeader({
  title,
  tabbed = false,
  children,
}: {
  title: string;
  tabbed?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "items-center justify-between gap-3 px-4 pt-4 pb-2",
        tabbed ? "hidden lg:flex" : "flex",
      )}
    >
      <h1 className="text-xl font-extrabold tracking-tight text-fg">{title}</h1>
      {children}
    </div>
  );
}
