"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, SubmitButton, TextArea } from "@/components/ui/form";
import { initialFormState } from "@/lib/validation/form";
import {
  reviewVerificationAction,
  setVerifiedAction,
  submitVerificationAction,
  withdrawVerificationAction,
} from "@/server/actions/verification";

export function ApplyForm() {
  const [state, action] = useActionState(submitVerificationAction, initialFormState);
  if (state.status === "success") return <FormMessage state={state} />;
  return (
    <form action={action} className="flex flex-col gap-3">
      <TextArea
        label="Anything that helps us confirm it's you (optional)"
        name="message"
        maxLength={500}
        rows={3}
        placeholder="Links to your other official accounts, club or media affiliation…"
        error={state.fieldErrors?.message}
      />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Sending…" className="sm:w-auto sm:self-start">
        Apply for verification
      </SubmitButton>
    </form>
  );
}

export function WithdrawButton() {
  const [state, action] = useActionState(withdrawVerificationAction, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-2">
      <div>
        <Button type="submit" variant="ghost">
          Withdraw request
        </Button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

/** Approve/reject with an inline confirmation step and an optional note. */
export function ReviewControls({
  requestId,
  handle,
}: {
  requestId: string;
  handle: string | null;
}) {
  const applicant = handle ? `@${handle}` : "this account";
  const [state, action] = useActionState(reviewVerificationAction, initialFormState);
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);

  if (state.status === "success") return <FormMessage state={state} />;

  if (!decision) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setDecision("approve")}>Approve</Button>
        <Button variant="danger" onClick={() => setDecision("reject")}>
          Reject
        </Button>
      </div>
    );
  }

  const approving = decision === "approve";
  return (
    <form action={action} className="flex flex-col gap-3 rounded-xl border border-line p-3">
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="decision" value={decision} />
      <input type="hidden" name="handle" value={handle ?? ""} />
      <input type="hidden" name="returnTo" value="admin" />
      <p className="text-sm text-fg" role="alert">
        {approving
          ? `Verify ${applicant}? Their badge appears immediately.`
          : `Reject ${applicant}'s request? They can reapply after the waiting period.`}
      </p>
      <TextArea
        label={approving ? "Internal note (optional)" : "Reason shown to the applicant (optional)"}
        name="note"
        maxLength={500}
        rows={2}
        error={state.fieldErrors?.note}
      />
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-2">
        <SubmitButton
          pendingLabel={approving ? "Approving…" : "Rejecting…"}
          className="h-10 w-auto px-4 text-sm"
        >
          {approving ? "Yes, approve" : "Yes, reject"}
        </SubmitButton>
        <Button variant="ghost" onClick={() => setDecision(null)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/** Revoke (or re-grant) a badge for a known handle, with confirmation. */
export function ToggleVerifiedButton({
  handle,
  verified,
  returnTo,
}: {
  handle: string;
  verified: boolean;
  returnTo?: "admin";
}) {
  const [state, action] = useActionState(setVerifiedAction, initialFormState);
  const [confirming, setConfirming] = useState(false);

  if (state.status === "success") return <FormMessage state={state} />;
  if (!confirming) {
    return (
      <Button
        variant={verified ? "danger" : "primary"}
        size="sm"
        onClick={() => setConfirming(true)}
      >
        {verified ? "Revoke badge" : "Verify account"}
      </Button>
    );
  }
  return (
    <form action={action} className="flex w-full flex-col gap-3 rounded-xl border border-line p-3">
      <input type="hidden" name="handle" value={handle} />
      <input type="hidden" name="verified" value={String(!verified)} />
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <p className="text-sm text-fg" role="alert">
        {verified ? `Remove @${handle}'s verified badge?` : `Verify @${handle} now?`}
      </p>
      <TextArea label="Note for the audit log (optional)" name="note" maxLength={500} rows={2} />
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingLabel="Saving…" className="h-10 w-auto px-4 text-sm">
          {verified ? "Yes, revoke" : "Yes, verify"}
        </SubmitButton>
        <Button variant="ghost" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/** Verify any account by handle, bypassing the request queue. */
export function VerifyByHandleForm() {
  const [state, action] = useActionState(setVerifiedAction, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="verified" value="true" />
      <input type="hidden" name="returnTo" value="admin" />
      <Field
        label="Handle"
        name="handle"
        placeholder="@handle"
        autoCapitalize="none"
        spellCheck={false}
        required
        error={state.fieldErrors?.handle}
      />
      <TextArea label="Note for the audit log (optional)" name="note" maxLength={500} rows={2} />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Verifying…" className="sm:w-auto sm:self-start">
        Verify account
      </SubmitButton>
    </form>
  );
}
