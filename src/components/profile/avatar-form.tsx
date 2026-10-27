"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { MAX_IMAGE_BYTES } from "@/lib/media/sniff";
import { initialFormState, type FormState } from "@/lib/validation/form";
import { removeAvatarAction, uploadAvatarAction } from "@/server/actions/profile";

const ACCEPT = "image/jpeg,image/png,image/webp";

/**
 * Profile photo picker. Checks size/type in the browser for quick feedback;
 * the server re-validates the actual bytes and re-encodes the image.
 */
export function AvatarForm({ current, hasAvatar }: { current: ReactNode; hasAvatar: boolean }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadState, uploadAction] = useActionState(
    async (prev: FormState, formData: FormData) => {
      const result = await uploadAvatarAction(prev, formData);
      if (result.status === "success") {
        setPreview(null);
        if (inputRef.current) inputRef.current.value = "";
      }
      return result;
    },
    initialFormState,
  );
  const [removeState, removeAction] = useActionState(removeAvatarAction, initialFormState);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setClientError(null);
    setPreview(null);
    if (!file) return;
    if (!ACCEPT.split(",").includes(file.type)) {
      setClientError("Use a JPEG, PNG or WebP image.");
    } else if (file.size > MAX_IMAGE_BYTES) {
      setClientError("Choose an image under 4 MB.");
    } else {
      setPreview(URL.createObjectURL(file));
      return;
    }
    event.target.value = "";
  }

  const fieldError = clientError ?? uploadState.fieldErrors?.avatar;
  const message = removeState.message && !uploadState.message ? removeState : uploadState;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- local blob preview
          <img
            src={preview}
            alt="Selected photo preview"
            className="size-20 rounded-full object-cover"
          />
        ) : (
          current
        )}
        <form action={uploadAction} className="flex flex-wrap items-center gap-2">
          <label className="cursor-pointer rounded-full border border-line bg-surface-2 px-4 py-2 text-sm font-semibold text-fg focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-lime hover:bg-surface-3">
            Choose photo
            <input
              ref={inputRef}
              type="file"
              name="avatar"
              accept={ACCEPT}
              onChange={onChange}
              className="sr-only"
              aria-describedby="avatar-hint"
              aria-invalid={fieldError ? true : undefined}
            />
          </label>
          {preview && (
            <SubmitButton pendingLabel="Uploading…" className="h-10 w-auto px-4 text-sm">
              Upload
            </SubmitButton>
          )}
        </form>
        {hasAvatar && !preview && (
          <form action={removeAction}>
            <Button type="submit" variant="ghost" size="md">
              Remove
            </Button>
          </form>
        )}
      </div>
      <p id="avatar-hint" className="text-xs text-muted">
        JPEG, PNG or WebP, up to 4 MB. Photos are cropped square and location data is removed.
      </p>
      {fieldError && <p className="text-xs font-medium text-danger">{fieldError}</p>}
      <FormMessage state={message} />
    </div>
  );
}
