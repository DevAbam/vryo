import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { isAdmin } from "@/server/services/verification";

/** Sidebar link to admin tools, rendered only for admins. Use inside <Suspense>. */
export async function AdminNavLink() {
  if (!(await isAdmin())) return null;
  return (
    <Link
      href="/admin/verification"
      title="Admin"
      className="flex h-12 items-center justify-center gap-4 rounded-full px-3 text-[0.9375rem] font-medium text-muted transition-colors hover:bg-surface hover:text-fg lg:justify-start lg:px-4"
    >
      <ShieldCheck aria-hidden="true" className="size-6 shrink-0" />
      <span className="sr-only lg:not-sr-only">Admin</span>
    </Link>
  );
}
