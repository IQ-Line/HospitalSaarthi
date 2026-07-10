/**
 * RFC 7807 "Problem Details for HTTP APIs" object.
 *
 * The five standard members are `type`, `title`, `status`, `detail`, `instance`.
 * Any additional keys are RFC 7807 "extension members" (e.g. `code`,
 * `correlationId`, `errors`) — hence the open index signature.
 */
export interface ProblemDetails {
  /** URI reference identifying the problem type. `about:blank` means "no semantics beyond `status`". */
  type: string;
  /** Short, human-readable, occurrence-independent summary of the problem type. */
  title: string;
  /** HTTP status code, duplicated here per RFC 7807 §3.1 for out-of-band consumers. */
  status: number;
  /** Human-readable explanation specific to this occurrence. */
  detail?: string;
  /** URI reference identifying the specific occurrence (we use the request path). */
  instance?: string;
  /** Extension member: stable machine-readable error code (e.g. `NOT_FOUND`). */
  code?: string;
  /** Extension member: request correlation id, when available. */
  correlationId?: string;
  /** RFC 7807 extension members. */
  [key: string]: unknown;
}

/** The media type every problem response is served with (RFC 7807 §6.1). */
export const PROBLEM_CONTENT_TYPE = "application/problem+json";
