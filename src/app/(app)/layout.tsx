import Link from "next/link";
import { Suspense } from "react";
import { Settings } from "lucide-react";
import { AdminNavLink } from "@/components/shell/admin-nav-link";
import { BottomNav, SectionTabs, SidebarNav } from "@/components/shell/nav-links";
import { RightRail } from "@/components/shell/right-rail";
import { ViewerAvatarLink, ViewerCard, ViewerCardSkeleton } from "@/components/shell/viewer";
import { Logo } from "@/components/ui/logo";
import { Skeleton } from "@/components/ui/primitives";

/**
 * Responsive app shell. The inspo is mobile-only, so it sets the visual
 * language and each breakpoint gets its own layout:
 *  - <md   mobile:  top bar + section tabs + single column + bottom nav
 *  - md    tablet:  icon rail on the left, wider single column
 *  - lg    laptop:  labelled sidebar | content | live rail
 *  - desk  desktop: same three columns with wider rails
 * Session reads sit behind <Suspense> so the shell itself prerenders.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-lime px-4 py-2 font-semibold text-on-lime focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <div className="mx-auto flex w-full max-w-[90rem] md:px-4 lg:gap-6 desk:gap-8">
        <header className="sticky top-0 hidden h-dvh w-20 shrink-0 flex-col py-4 md:flex lg:w-64 desk:w-72">
          <div className="flex justify-center px-2 pb-6 lg:justify-start lg:px-4">
            <Logo className="lg:hidden" compact />
            <Logo className="hidden lg:inline-flex" />
          </div>
          <nav aria-label="Primary" className="flex-1">
            <SidebarNav />
            <Suspense fallback={null}>
              <AdminNavLink />
            </Suspense>
          </nav>
          <Suspense fallback={<ViewerCardSkeleton />}>
            <ViewerCard />
          </Suspense>
        </header>

        <div className="flex min-w-0 flex-1 justify-center gap-6 desk:gap-8">
          <main
            id="main"
            className="w-full min-w-0 pb-24 md:max-w-2xl md:border-x md:border-line md:pb-8 lg:max-w-[40rem] desk:max-w-[42rem]"
          >
            <div className="sticky top-0 z-20 bg-bg/90 pt-safe backdrop-blur">
              <div className="flex h-14 items-center justify-between px-4 md:hidden">
                <Suspense fallback={<Skeleton className="size-8 rounded-full" />}>
                  <ViewerAvatarLink />
                </Suspense>
                <Logo />
                <Link
                  href="/settings"
                  className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-fg"
                >
                  <Settings aria-hidden="true" className="size-5" />
                  <span className="sr-only">Settings</span>
                </Link>
              </div>
              <SectionTabs />
            </div>
            {children}
          </main>

          <RightRail />
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
