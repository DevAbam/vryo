"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/cn";
import type { FormState } from "@/lib/validation/form";
import { buttonClass } from "./button";

const inputClass =
  "h-11 w-full rounded-xl border border-line bg-surface-2 px-3.5 text-base text-fg placeholder:text-subtle focus:border-lime focus:outline-none aria-[invalid=true]:border-danger sm:text-sm";

type FieldProps = ComponentProps<"input"> & {
  label: string;
  error?: string;
  hint?: ReactNode;
};

/** Labelled input with an error message wired to aria-describedby. */
export function Field({ label, error, hint, className, id, ...props }: FieldProps) {
  const generated = useId();
  const inputId = id ?? generated;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={inputId} className="text-sm font-medium text-fg">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={inputClass}
        {...props}
      />
      {hint && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

type TextAreaProps = ComponentProps<"textarea"> & { label: string; error?: string };

export function TextArea({ label, error, className, id, ...props }: TextAreaProps) {
  const generated = useId();
  const inputId = id ?? generated;
  const errorId = `${inputId}-error`;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={inputId} className="text-sm font-medium text-fg">
        {label}
      </label>
      <textarea
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(inputClass, "h-auto min-h-24 py-2.5")}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function SubmitButton({
  children,
  pendingLabel,
  className,
}: {
  children: ReactNode;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={buttonClass("primary", "lg", cn("w-full", className))}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

/** Form-level status message, announced to screen readers. */
export function FormMessage({ state }: { state: FormState }) {
  if (!state.message) return <div role="status" aria-live="polite" className="sr-only" />;
  const isError = state.status === "error";
  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live="polite"
      className={cn(
        "rounded-xl border px-3.5 py-3 text-sm",
        isError
          ? "border-danger/40 bg-danger/10 text-danger"
          : "border-success/40 bg-success/10 text-success",
      )}
    >
      {state.message}
    </div>
  );
}
