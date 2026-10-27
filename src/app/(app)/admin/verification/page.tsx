import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { PageBodySkeleton } from "@/components/shell/placeholder";
import { Avatar } from "@/components/ui/avatar";
import { Card, EmptyState } from "@/components/ui/primitives";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import {
  ReviewControls,
  ToggleVerifiedButton,
  VerifyByHandleForm,
} from "@/components/verification/verification-forms";
import { cn } from "@/lib/cn";
import { handleSchema } from "@/lib/validation/profile";
import {
  ADMIN_PAGE_SIZE,
  listRequests,
  listVerifiedProfiles,
  type ReviewItem,
} from "@/server/repositories/verification";
import { requireAdmin } from "@/server/services/verification";

export const metadata: Metadata = { title: "Verification · Admin" };

const VIEWS = [
  { value: "pending", label: "Pending" },
  { value: "history", label: "History" },
  { value: "verified", label: "Verified" },
] as const;
type View = (typeof VIEWS)[number]["value"];

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" });
const numberFormat = new Intl.NumberFormat("en");

export default function AdminVerificationPage({ searchParams }: PageProps<"/admin/verification">) {
  return (
    <>
      <PageHeader title="Verification" />
      <div className="px-4 py-4">
        <Suspense fallback={<PageBodySkeleton />}>
          <AdminBody searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function AdminBody({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const raw = params.view;
  const view: View = VIEWS.some((v) => v.value === raw) ? (raw as View) : "pending";
  const notice = noticeText(params.notice, params.handle);

  return (
    <div className="flex flex-col gap-4">
      {notice && (
        <div
          role="status"
          className="rounded-xl border border-lime/40 bg-lime/10 px-3.5 py-3 text-sm text-fg"
        >
          {notice}
        </div>
      )}
      <nav aria-label="Verification views">
        <ul className="flex gap-2">
          {VIEWS.map(({ value, label }) => (
            <li key={value}>
              <Link
                href={`/admin/verification?view=${value}`}
                aria-current={view === value ? "page" : undefined}
                className={cn(
                  "inline-flex h-8 items-center rounded-full border px-3.5 text-sm font-semibold",
                  view === value
                    ? "border-lime bg-lime text-on-lime"
                    : "border-line bg-surface text-fg hover:bg-surface-2",
                )}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {view === "pending" && <PendingList />}
      {view === "history" && <HistoryList />}
      {view === "verified" && <VerifiedList />}
    </div>
  );
}

/** Confirmation banner after an admin action; the handle is re-validated. */
function noticeText(notice: unknown, rawHandle: unknown): string | null {
  const parsed = handleSchema.safeParse(rawHandle);
  const who = parsed.success ? `@${parsed.data}` : "The account";
  switch (notice) {
    case "approved":
      return `Approved ${who}. They're now verified.`;
    case "rejected":
      return `Rejected ${who}'s request. They can reapply after the waiting period.`;
    case "verified":
      return `${who} is now verified.`;
    case "revoked":
      return `Removed the verified badge from ${who}.`;
    default:
      return null;
  }
}

function Applicant({ item }: { item: ReviewItem }) {
  const applicant = item.applicant;
  if (!applicant) return <p className="text-sm text-muted">Account unavailable</p>;
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={applicant.display_name} seed={applicant.id} path={applicant.avatar_path} />
      <div className="min-w-0">
        <p className="flex items-center gap-1 truncate font-bold text-fg">
          <span className="truncate">{applicant.display_name}</span>
          {applicant.verified_at && <VerifiedBadge />}
        </p>
        <p className="truncate text-sm text-muted">@{applicant.handle}</p>
      </div>
    </div>
  );
}

function CappedNote({ count }: { count: number }) {
  if (count < ADMIN_PAGE_SIZE) return null;
  return <p className="text-xs text-subtle">Showing the first {ADMIN_PAGE_SIZE}.</p>;
}

async function PendingList() {
  const items = await listRequests("pending");
  if (items.length === 0) {
    return <EmptyState title="No pending requests">New applications will appear here.</EmptyState>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.id}>
          <Card className="flex flex-col gap-4 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <Applicant item={item} />
              {item.applicant?.handle && (
                <Link
                  href={`/profile/${item.applicant.handle}`}
                  target="_blank"
                  className="text-sm font-semibold text-lime hover:text-lime-hover"
                >
                  Review profile ↗
                </Link>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted">Followers at request</dt>
                <dd className="text-fg">{numberFormat.format(item.follower_count_at_submit)}</dd>
              </div>
              <div>
                <dt className="text-muted">Requested</dt>
                <dd className="text-fg">{dateFormat.format(new Date(item.created_at))}</dd>
              </div>
              {item.applicant && (
                <div>
                  <dt className="text-muted">Joined</dt>
                  <dd className="text-fg">
                    {dateFormat.format(new Date(item.applicant.created_at))}
                  </dd>
                </div>
              )}
            </dl>
            {item.message && (
              <div className="rounded-xl bg-surface-2 p-3">
                <p className="mb-1 text-xs font-semibold text-muted">Applicant&apos;s note</p>
                <p className="text-sm break-words whitespace-pre-line text-fg">{item.message}</p>
              </div>
            )}
            <ReviewControls requestId={item.id} handle={item.applicant?.handle ?? null} />
          </Card>
        </li>
      ))}
      <CappedNote count={items.length} />
    </ul>
  );
}

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-lime/15 text-lime",
  rejected: "bg-danger/15 text-danger",
  withdrawn: "bg-surface-3 text-muted",
};

async function HistoryList() {
  const items = await listRequests("history");
  if (items.length === 0) {
    return <EmptyState title="No decisions yet">Reviewed requests will appear here.</EmptyState>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.id}>
          <Card className="flex flex-col gap-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Applicant item={item} />
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-bold capitalize",
                  STATUS_STYLES[item.status],
                )}
              >
                {item.status}
              </span>
            </div>
            <p className="text-sm text-muted">
              {item.reviewed_at && dateFormat.format(new Date(item.reviewed_at))}
              {item.reviewer && ` · by @${item.reviewer.handle}`}
            </p>
            {item.review_note && (
              <p className="text-sm break-words whitespace-pre-line text-fg">{item.review_note}</p>
            )}
          </Card>
        </li>
      ))}
      <CappedNote count={items.length} />
    </ul>
  );
}

async function VerifiedList() {
  const profiles = await listVerifiedProfiles();
  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <h2 className="mb-3 text-sm font-bold text-fg">Verify an account directly</h2>
        <VerifyByHandleForm />
      </Card>
      {profiles.length === 0 ? (
        <EmptyState title="No verified accounts yet" />
      ) : (
        <ul className="flex flex-col gap-3">
          {profiles.map((profile) => (
            <li key={profile.id}>
              <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar
                    name={profile.display_name}
                    seed={profile.id}
                    path={profile.avatar_path}
                  />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 font-bold text-fg">
                      <span className="truncate">{profile.display_name}</span>
                      <VerifiedBadge />
                    </p>
                    <p className="truncate text-sm text-muted">
                      @{profile.handle}
                      {profile.verified_at &&
                        ` · since ${dateFormat.format(new Date(profile.verified_at))}`}
                    </p>
                  </div>
                </div>
                {profile.handle && (
                  <ToggleVerifiedButton handle={profile.handle} verified returnTo="admin" />
                )}
              </Card>
            </li>
          ))}
          <CappedNote count={profiles.length} />
        </ul>
      )}
    </div>
  );
}
