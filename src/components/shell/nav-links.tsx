"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/cn";
import { BOTTOM_NAV, SECTION_TABS, SIDEBAR_NAV, isActive } from "./nav";

function SidebarNavList({ pathname }: { pathname: string }) {
  return (
    <ul className="flex flex-col gap-1">
      {SIDEBAR_NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              title={label}
              className={cn(
                "flex h-12 items-center justify-center gap-4 rounded-full px-3 text-[0.9375rem] transition-colors lg:justify-start lg:px-4",
                active
                  ? "bg-surface-2 font-bold text-fg"
                  : "font-medium text-muted hover:bg-surface hover:text-fg",
              )}
            >
              <Icon
                aria-hidden="true"
                className={cn("size-6 shrink-0", active && "text-lime")}
                strokeWidth={active ? 2.5 : 2}
              />
              <span className="sr-only lg:not-sr-only">{label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function BottomNavList({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 pb-safe backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex h-16 max-w-lg items-stretch justify-around px-2">
        {BOTTOM_NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium",
                  active ? "text-lime" : "text-muted hover:text-fg",
                )}
              >
                <Icon aria-hidden="true" className="size-6" strokeWidth={active ? 2.5 : 2} />
                <span className="sr-only">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function SectionTabsList({ pathname }: { pathname: string }) {
  if (!SECTION_TABS.some(({ href }) => isActive(pathname, href))) return null;

  return (
    <nav aria-label="Sections" className="border-b border-line lg:hidden">
      <ul className="flex">
        {SECTION_TABS.map(({ href, label }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-11 items-center justify-center text-sm",
                  active ? "font-bold text-fg" : "font-medium text-muted hover:text-fg",
                )}
              >
                {label}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-1/4 bottom-0 h-0.5 rounded-full bg-lime"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const SPORT_CHIPS = [
  { value: null, label: "All sports" },
  { value: "football", label: "Football" },
  { value: "basketball", label: "Basketball" },
] as const;

/** Sport filter chips. State lives in the URL (?sport=) so it is shareable. */
export function SportChips() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("sport");

  return (
    <nav aria-label="Filter by sport" className="-mx-4 scrollbar-none overflow-x-auto px-4">
      <ul className="flex gap-2">
        {SPORT_CHIPS.map(({ value, label }) => {
          const active = current === value || (!value && !current);
          const params = new URLSearchParams(searchParams);
          if (value) params.set("sport", value);
          else params.delete("sport");
          const query = params.toString();
          return (
            <li key={label}>
              <Link
                href={query ? `${pathname}?${query}` : pathname}
                aria-current={active ? "true" : undefined}
                replace
                scroll={false}
                className={cn(
                  "inline-flex h-8 items-center rounded-full border px-3.5 text-sm font-semibold whitespace-nowrap transition-colors",
                  active
                    ? "border-lime bg-lime text-on-lime"
                    : "border-line bg-surface text-fg hover:bg-surface-2",
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// usePathname() is request data on dynamic routes, so each nav streams in
// behind Suspense. The fallback is the same nav without an active item.

function SidebarNavLive() {
  return <SidebarNavList pathname={usePathname()} />;
}

/** Tablet icon rail (md) that expands to a labelled sidebar (lg+). */
export function SidebarNav() {
  return (
    <Suspense fallback={<SidebarNavList pathname="" />}>
      <SidebarNavLive />
    </Suspense>
  );
}

function BottomNavLive() {
  return <BottomNavList pathname={usePathname()} />;
}

/** Mobile bottom navigation. Hidden from `md`, where the rail takes over. */
export function BottomNav() {
  return (
    <Suspense fallback={<BottomNavList pathname="" />}>
      <BottomNavLive />
    </Suspense>
  );
}

function SectionTabsLive() {
  return <SectionTabsList pathname={usePathname()} />;
}

/** Feed / Stream / Spaces tabs with the inspo's lime underline. Below `lg` only. */
export function SectionTabs() {
  return (
    <Suspense fallback={null}>
      <SectionTabsLive />
    </Suspense>
  );
}
