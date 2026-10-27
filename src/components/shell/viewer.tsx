import Link from "next/link";
import { LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/primitives";
import { signOutAction } from "@/server/actions/auth";
import { requireViewer } from "@/server/services/profile";

/** Mobile top-bar avatar linking to the viewer's profile. Render inside <Suspense>. */
export async function ViewerAvatarLink() {
  const { profile } = await requireViewer();
  return (
    <Link href={`/profile/${profile.handle}`} className="rounded-full" aria-label="Your profile">
      <Avatar name={profile.display_name} seed={profile.id} size="sm" />
    </Link>
  );
}

/** Sidebar account card (lg+) with sign-out. Render inside <Suspense>. */
export async function ViewerCard() {
  const { profile } = await requireViewer();
  return (
    <div className="flex items-center gap-3 rounded-full p-2 lg:pr-3">
      <Link
        href={`/profile/${profile.handle}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-full"
        aria-label="Your profile"
      >
        <Avatar name={profile.display_name} seed={profile.id} />
        <span className="hidden min-w-0 flex-col lg:flex">
          <span className="truncate text-sm font-bold text-fg">{profile.display_name}</span>
          <span className="truncate text-xs text-muted">@{profile.handle}</span>
        </span>
      </Link>
      <form action={signOutAction} className="hidden lg:block">
        <button
          type="submit"
          className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-fg"
          title="Sign out"
        >
          <LogOut aria-hidden="true" className="size-4" />
          <span className="sr-only">Sign out</span>
        </button>
      </form>
    </div>
  );
}

export function ViewerCardSkeleton() {
  return (
    <div className="flex items-center gap-3 p-2">
      <Skeleton className="size-10 rounded-full" />
      <div className="hidden flex-1 flex-col gap-1.5 lg:flex">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}
