import { randomInt } from "node:crypto";

export interface StoredLinkOtp {
  otp: string;
  expiresAtMs: number;
}

/** In-process TTL store for user-initiated link OTP (single-use). */
export class LinkOtpStore {
  private readonly entries = new Map<string, StoredLinkOtp>();

  put(input: { linkRefNumber: string; otp: string; expiresAt: Date }): void {
    this.entries.set(input.linkRefNumber, {
      otp: input.otp,
      expiresAtMs: input.expiresAt.getTime(),
    });
  }

  /** @internal vitest only */
  peekOtp(linkRefNumber: string): string | undefined {
    const row = this.entries.get(linkRefNumber);
    if (!row || Date.now() > row.expiresAtMs) return undefined;
    return row.otp;
  }

  consume(input: { linkRefNumber: string; token: string }): boolean {
    const row = this.entries.get(input.linkRefNumber);
    if (!row) return false;
    this.entries.delete(input.linkRefNumber);
    if (Date.now() > row.expiresAtMs) return false;
    return row.otp === input.token.trim();
  }
}

export function generateLinkOtp6(): string {
  return String(randomInt(100_000, 1_000_000));
}

export function parseCommunicationExpiry(iso?: string): Date {
  if (iso) {
    const parsed = Date.parse(iso);
    if (!Number.isNaN(parsed)) return new Date(parsed);
  }
  return new Date(Date.now() + 10 * 60 * 1000);
}
