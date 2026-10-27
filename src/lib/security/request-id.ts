export const REQUEST_ID_HEADER = "x-request-id";

const VALID = /^[A-Za-z0-9._-]{8,100}$/;

/** Keeps a well-formed upstream request id (e.g. from the hosting edge) or makes a new one. */
export function resolveRequestId(incoming: string | null): string {
  return incoming && VALID.test(incoming) ? incoming : crypto.randomUUID();
}
