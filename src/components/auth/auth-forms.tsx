"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/ui/form";
import { cn } from "@/lib/cn";
import { initialFormState } from "@/lib/validation/form";
import { SPORTS } from "@/lib/validation/profile";
import {
  requestPasswordResetAction,
  signInAction,
  signUpAction,
  updatePasswordAction,
} from "@/server/actions/auth";
import { completeOnboardingAction } from "@/server/actions/profile";

const PASSWORD_HINT = "At least 10 characters with upper and lower case letters and a number.";

export function LoginForm() {
  const [state, formAction] = useActionState(signInAction, initialFormState);
  const searchParams = useSearchParams();
  const errors = state.fieldErrors ?? {};
  const linkFailed = searchParams.get("error") === "link";

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="next" value={searchParams.get("next") ?? ""} />
      {linkFailed && state.status === "idle" && (
        <FormMessage
          state={{
            status: "error",
            message: "That link is invalid or has expired. Sign in or request a new one.",
          }}
        />
      )}
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        error={errors.email}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={errors.password}
      />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
      <Link href="/reset-password" className="self-center text-sm text-muted hover:text-fg">
        Forgot your password?
      </Link>
    </form>
  );
}

export function SignupForm() {
  const [state, formAction] = useActionState(signUpAction, initialFormState);
  const errors = state.fieldErrors ?? {};

  if (state.status === "success") return <FormMessage state={state} />;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <Field
        label="Display name"
        name="displayName"
        autoComplete="nickname"
        maxLength={50}
        required
        error={errors.displayName}
      />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        error={errors.email}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint={PASSWORD_HINT}
        error={errors.password}
      />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Creating account…">Create account</SubmitButton>
    </form>
  );
}

export function ResetRequestForm() {
  const [state, formAction] = useActionState(requestPasswordResetAction, initialFormState);
  const errors = state.fieldErrors ?? {};

  if (state.status === "success") return <FormMessage state={state} />;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        error={errors.email}
      />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Sending…">Send reset link</SubmitButton>
    </form>
  );
}

export function UpdatePasswordForm() {
  const [state, formAction] = useActionState(updatePasswordAction, initialFormState);
  const errors = state.fieldErrors ?? {};

  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-4">
        <FormMessage state={state} />
        <Link href="/feed" className="self-center text-sm font-semibold text-lime">
          Continue to VYRO
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint={PASSWORD_HINT}
        error={errors.password}
      />
      <Field
        label="Confirm new password"
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
        error={errors.confirm}
      />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Updating…">Update password</SubmitButton>
    </form>
  );
}

const SPORT_LABELS: Record<(typeof SPORTS)[number], string> = {
  football: "Football",
  basketball: "Basketball",
};

export function OnboardingForm({ suggestedHandle }: { suggestedHandle: string }) {
  const [state, formAction] = useActionState(completeOnboardingAction, initialFormState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <Field
        label="Choose your handle"
        name="handle"
        defaultValue={suggestedHandle}
        maxLength={20}
        required
        autoCapitalize="none"
        spellCheck={false}
        hint="3–20 letters, numbers or underscores. This is your @name."
        error={errors.handle}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium text-fg">What do you follow?</legend>
        <div className="flex flex-wrap gap-2">
          {SPORTS.map((sport) => (
            <label key={sport} className="cursor-pointer">
              <input
                type="checkbox"
                name="favouriteSports"
                value={sport}
                defaultChecked
                className="peer sr-only"
              />
              <span
                className={cn(
                  "inline-flex h-10 items-center rounded-full border border-line bg-surface px-4 text-sm font-semibold text-fg",
                  "peer-checked:border-lime peer-checked:bg-lime peer-checked:text-on-lime",
                  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-lime",
                )}
              >
                {SPORT_LABELS[sport]}
              </span>
            </label>
          ))}
        </div>
        {errors.favouriteSports && (
          <p className="text-xs font-medium text-danger">{errors.favouriteSports}</p>
        )}
      </fieldset>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Saving…">Continue</SubmitButton>
    </form>
  );
}
