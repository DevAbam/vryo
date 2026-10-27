export const ERROR_CODES = {
  VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  RESOURCE_NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
  DEPENDENCY_UNAVAILABLE: 503,
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

const DEFAULT_MESSAGES: Record<ErrorCode, string> = {
  VALIDATION_FAILED: "The request was invalid.",
  UNAUTHENTICATED: "You need to sign in.",
  FORBIDDEN: "You don't have permission to do that.",
  RESOURCE_NOT_FOUND: "The requested resource was not found.",
  CONFLICT: "That conflicts with existing data.",
  RATE_LIMITED: "Too many attempts. Please try again later.",
  INTERNAL: "Something went wrong. Please try again.",
  DEPENDENCY_UNAVAILABLE: "A service we depend on is unavailable. Please try again shortly.",
};

/** Typed application error. `message` is safe to show users; `cause` never is. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly retryAfterSeconds?: number;

  constructor(
    code: ErrorCode,
    options: { message?: string; cause?: unknown; retryAfterSeconds?: number } = {},
  ) {
    super(options.message ?? DEFAULT_MESSAGES[code], { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    this.status = ERROR_CODES[code];
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

export type ErrorBody = {
  error: { code: ErrorCode; message: string; requestId: string };
};

/** Converts any thrown value into the public error contract without leaking internals. */
export function toErrorBody(
  error: unknown,
  requestId: string,
): { status: number; body: ErrorBody } {
  const appError = error instanceof AppError ? error : new AppError("INTERNAL");
  return {
    status: appError.status,
    body: { error: { code: appError.code, message: appError.message, requestId } },
  };
}

export function errorResponse(error: unknown, requestId: string): Response {
  const { status, body } = toErrorBody(error, requestId);
  const headers = new Headers({ "x-request-id": requestId });
  if (error instanceof AppError && error.retryAfterSeconds) {
    headers.set("retry-after", String(error.retryAfterSeconds));
  }
  return Response.json(body, { status, headers });
}
