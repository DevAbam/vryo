import { Card } from "@/components/ui/primitives";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import type { Viewer } from "@/server/services/profile";
import { getVerificationState } from "@/server/services/verification";
import { ApplyForm, WithdrawButton } from "./verification-forms";

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" });
const numberFormat = new Intl.NumberFormat("en");

/** Settings card: requirements, request status and the application form. */
export async function VerificationCard({ viewer }: { viewer: Viewer }) {
  const state = await getVerificationState(viewer);

  if (state.verified) {
    return (
      <Card className="flex flex-col gap-2 p-4 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-bold text-fg">
          Verification <VerifiedBadge />
        </h2>
        <p className="text-sm text-muted">Your account is verified.</p>
      </Card>
    );
  }

  const progress = Math.min(100, Math.round((state.followers / state.minFollowers) * 100));
  const latest = state.latest;

  return (
    <Card className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-bold text-fg">Verification</h2>
        <p className="text-sm text-muted">
          Verified accounts get the green badge next to their name. Accounts with at least{" "}
          {numberFormat.format(state.minFollowers)} followers can apply, and our team reviews each
          request for authenticity.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-sm">
          <span className="text-fg">Followers</span>
          <span className="text-muted">
            {numberFormat.format(state.followers)} / {numberFormat.format(state.minFollowers)}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Followers towards verification"
          aria-valuemin={0}
          aria-valuemax={state.minFollowers}
          aria-valuenow={state.followers}
          className="h-2 overflow-hidden rounded-full bg-surface-3"
        >
          <div className="h-full rounded-full bg-lime" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {latest?.status === "pending" && (
        <div className="flex flex-col gap-2 rounded-xl border border-lime/40 bg-lime/5 p-3">
          <p className="text-sm font-semibold text-fg">Request under review</p>
          <p className="text-sm text-muted">
            Sent {dateFormat.format(new Date(latest.created_at))}. We&apos;ll update your badge once
            it&apos;s reviewed.
          </p>
          <WithdrawButton />
        </div>
      )}

      {latest?.status === "rejected" && (
        <div className="flex flex-col gap-1 rounded-xl border border-line p-3">
          <p className="text-sm font-semibold text-fg">Your last request wasn&apos;t approved</p>
          {latest.review_note && <p className="text-sm text-muted">{latest.review_note}</p>}
          {state.blocker === "cooldown" && state.reapplyAt && (
            <p className="text-sm text-muted">
              You can apply again from {dateFormat.format(state.reapplyAt)}.
            </p>
          )}
        </div>
      )}

      {state.blocker !== "pending" && (
        <>
          {state.blocker === "followers" && (
            <p className="text-sm text-muted">
              You need {numberFormat.format(state.minFollowers - state.followers)} more followers to
              apply.
            </p>
          )}
          {state.blocker === null && <ApplyForm />}
        </>
      )}
    </Card>
  );
}
