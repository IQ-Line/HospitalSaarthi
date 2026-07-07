import { randomInt } from "node:crypto";
import type { LinkOtpStorePort } from "../ports.js";
import { isNonDevNodeEnv } from "./abdm-runtime-env.js";
import { secureOtpCompare } from "./secure-otp-compare.js";

export interface StoredLinkOtp {
  otp: string;
  expiresAtMs: number;
}

/** In-process OTP store for unit/sandbox tests only (not multi-pod safe). */
export class InMemoryLinkOtpStore implements LinkOtpStorePort {
  constructor() {
    if (isNonDevNodeEnv()) {
      throw new Error(
        "InMemoryLinkOtpStore is not allowed when NODE_ENV is production or staging",
      );
    }
  }

  private readonly entries = new Map<string, StoredLinkOtp>();

  private key(iqTenantId: string, linkRefNumber: string): string {
    return `${iqTenantId}:${linkRefNumber}`;
  }

  async put(input: {
    iqTenantId: string;
    linkRefNumber: string;
    otp: string;
    expiresAt: Date;
  }): Promise<void> {
    this.entries.set(this.key(input.iqTenantId, input.linkRefNumber), {
      otp: input.otp,
      expiresAtMs: input.expiresAt.getTime(),
    });
  }

  /** @internal vitest / sandbox only */
  peekOtp(iqTenantId: string, linkRefNumber: string): string | undefined {
    const row = this.entries.get(this.key(iqTenantId, linkRefNumber));
    if (!row || Date.now() > row.expiresAtMs) return undefined;
    return row.otp;
  }

  async consume(input: {
    iqTenantId: string;
    linkRefNumber: string;
    token: string;
  }): Promise<boolean> {
    const k = this.key(input.iqTenantId, input.linkRefNumber);
    const row = this.entries.get(k);
    if (!row) return false;
    this.entries.delete(k);
    if (Date.now() > row.expiresAtMs) return false;
    return secureOtpCompare(row.otp, input.token);
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
