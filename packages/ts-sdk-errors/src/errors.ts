import type { ProblemDetails } from "./problem-details.js";

export interface AppErrorOptions {
  /** Occurrence-specific detail. Falls back to the constructor `message`. */
  detail?: string;
  /** Extra RFC 7807 extension members to fold into the problem body. */
  extensions?: Record<string, unknown>;
  /** Underlying cause, preserved for server-side logging (never serialised to clients). */
  cause?: unknown;
}

/**
 * Base class for expected, client-facing domain errors.
 *
 * Subclasses fix `status`, `code` and `title`; `toProblem()` renders the
 * RFC 7807 body. Throw these from use-cases/handlers — the Fastify error
 * handler (see `registerProblemErrorHandler`) maps them to responses.
 */
export abstract class AppError extends Error {
  /** HTTP status code for this error class. */
  abstract readonly status: number;
  /** Stable machine-readable code, also used to derive the problem `type`. */
  abstract readonly code: string;
  /** Stable, occurrence-independent human summary. */
  abstract readonly title: string;

  readonly extensions: Record<string, unknown>;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(options.detail ?? message, options.cause !== undefined ? { cause: options.cause } : undefined);
    // `new.target.name` gives the concrete subclass name (e.g. "NotFoundError").
    this.name = new.target.name;
    this.extensions = options.extensions ?? {};
  }

  /** URI reference for the problem `type`. A URN — categorises without implying a dereferenceable URL. */
  get type(): string {
    return `urn:hims:error:${this.code.toLowerCase()}`;
  }

  /** Render this error as an RFC 7807 problem object. */
  toProblem(instance?: string): ProblemDetails {
    const problem: ProblemDetails = {
      type: this.type,
      title: this.title,
      status: this.status,
      code: this.code,
    };
    if (this.message) problem.detail = this.message;
    if (instance !== undefined) problem.instance = instance;
    // Extension members last so callers can enrich (but not override core fields silently).
    for (const [key, value] of Object.entries(this.extensions)) {
      problem[key] = value;
    }
    return problem;
  }
}

export class NotFoundError extends AppError {
  readonly status = 404;
  readonly code = "NOT_FOUND";
  readonly title = "Resource Not Found";
}

/** A single field-level validation violation. */
export interface FieldViolation {
  field: string;
  message: string;
}

export interface ValidationErrorOptions extends AppErrorOptions {
  /** Structured field violations, surfaced under the `errors` extension member. */
  errors?: FieldViolation[];
}

export class ValidationError extends AppError {
  readonly status = 400;
  readonly code = "VALIDATION_FAILED";
  readonly title = "Validation Failed";

  constructor(message: string, options: ValidationErrorOptions = {}) {
    const { errors, extensions, ...rest } = options;
    super(message, {
      ...rest,
      extensions: errors && errors.length > 0 ? { ...extensions, errors } : extensions,
    });
  }
}

export class ConflictError extends AppError {
  readonly status = 409;
  readonly code = "CONFLICT";
  readonly title = "Conflict";
}

export class UnauthorizedError extends AppError {
  readonly status = 401;
  readonly code = "UNAUTHORIZED";
  readonly title = "Unauthorized";
}

export class ForbiddenError extends AppError {
  readonly status = 403;
  readonly code = "FORBIDDEN";
  readonly title = "Forbidden";
}
