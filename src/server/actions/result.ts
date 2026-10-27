import "server-only";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/observability/logger";
import type { FormState } from "@/lib/validation/form";

/** Maps a thrown error to a safe form state; unexpected errors are logged, not shown. */
export function failure(error: unknown, requestId: string, action: string): FormState {
  if (error instanceof AppError) {
    if (error.status >= 500) logger.error(`${action}.failed`, { requestId, code: error.code });
    return { status: "error", message: error.message };
  }
  logger.error(`${action}.unexpected`, { requestId, error });
  return { status: "error", message: new AppError("INTERNAL").message };
}
