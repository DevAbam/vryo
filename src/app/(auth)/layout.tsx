import type { ReactNode } from "react";
import { BrandPanel } from "@/components/auth/brand-panel";
import { Logo } from "@/components/ui/logo";

/** Mobile: single centred column. Laptop and up: brand panel beside the form. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="pt-safe pb-safe">
      <div className="mx-auto grid min-h-dvh w-full max-w-6xl gap-8 px-4 py-6 lg:grid-cols-2 lg:items-stretch lg:px-8 lg:py-8">
        <BrandPanel />
        <main id="main" className="flex flex-col items-center justify-center">
          <div className="flex w-full max-w-sm flex-col gap-8">
            <div className="flex justify-center lg:hidden">
              <Logo />
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
