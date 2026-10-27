"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, SubmitButton, TextArea } from "@/components/ui/form";
import { initialFormState } from "@/lib/validation/form";
import { signOutAction, signOutEverywhereAction } from "@/server/actions/auth";
import { updateProfileAction } from "@/server/actions/profile";

export function ProfileForm({
  initial,
}: {
  initial: { handle: string; displayName: string; bio: string };
}) {
  const [state, formAction] = useActionState(updateProfileAction, initialFormState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <Field
        label="Display name"
        name="displayName"
        defaultValue={initial.displayName}
        maxLength={50}
        required
        autoComplete="nickname"
        error={errors.displayName}
      />
      <Field
        label="Handle"
        name="handle"
        defaultValue={initial.handle}
        maxLength={20}
        required
        autoCapitalize="none"
        spellCheck={false}
        hint="3–20 letters, numbers or underscores."
        error={errors.handle}
      />
      <TextArea
        label="Bio"
        name="bio"
        defaultValue={initial.bio}
        maxLength={160}
        rows={3}
        error={errors.bio}
      />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Saving…" className="sm:w-auto sm:self-start">
        Save profile
      </SubmitButton>
    </form>
  );
}

/** Sign out here, or everywhere (with an inline confirmation step). */
export function SessionControls() {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex flex-col gap-3 border-t border-line pt-4">
      <form action={signOutAction}>
        <Button type="submit" variant="secondary">
          Sign out
        </Button>
      </form>

      {confirming ? (
        <form
          action={signOutEverywhereAction}
          className="flex flex-col gap-3 rounded-xl border border-danger/40 p-3"
        >
          <p className="text-sm text-fg" role="alert">
            This signs you out on every device, including this one. Continue?
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="danger">
              Yes, sign out everywhere
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div>
          <Button variant="danger" onClick={() => setConfirming(true)}>
            Sign out of all devices
          </Button>
        </div>
      )}
    </div>
  );
}
