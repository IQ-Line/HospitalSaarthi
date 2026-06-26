import { timingSafeEqual } from "node:crypto";

/** Constant-time OTP compare — lengths must match or comparison fails closed. */
export function secureOtpCompare(
  stored: string,
  provided: string | null | undefined,
): boolean {
  if (provided == null) return false;
  const a = stored.trim();
  const b = provided.trim();
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
