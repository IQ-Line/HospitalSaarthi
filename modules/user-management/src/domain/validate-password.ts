import { ValidationError } from "./errors.js";

/**
 * Shared password policy (MVP: non-empty string, min 8 chars). Throws {@link ValidationError}.
 * Used by both create-user and admin reset (Flow A) so the rule lives in one place.
 */
export function assertValidPassword(value: unknown): asserts value is string {
  if (typeof value !== "string") {
    throw new ValidationError("password_invalid_type");
  }
  if (value.trim() === "") {
    throw new ValidationError("password_required");
  }
  if (value.length < 8) {
    throw new ValidationError("password_too_short");
  }
}
