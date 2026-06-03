import { createHash } from "node:crypto";
import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq, lt, sql } from "@hims/ts-sdk-db";
import { abdmLinkOtps } from "../schema/tables.js";
import type { LinkOtpStorePort } from "../ports.js";

const MAX_ATTEMPTS = 5;

function hashOtp(otp: string): string {
  return createHash("sha256").update(otp.trim()).digest("hex");
}

export class DrizzleLinkOtpsRepo implements LinkOtpStorePort {
  constructor(private readonly db: DbInstance) {}

  async put(input: {
    iqTenantId: string;
    linkRefNumber: string;
    otp: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.db
      .insert(abdmLinkOtps)
      .values({
        iq_tenant_id: input.iqTenantId,
        link_ref_number: input.linkRefNumber,
        otp_hash: hashOtp(input.otp),
        expires_at: input.expiresAt,
        attempts: 0,
      })
      .onConflictDoUpdate({
        target: [abdmLinkOtps.iq_tenant_id, abdmLinkOtps.link_ref_number],
        set: {
          otp_hash: hashOtp(input.otp),
          expires_at: input.expiresAt,
          attempts: 0,
          created_at: sql`now()`,
        },
      });
  }

  async consume(input: {
    iqTenantId: string;
    linkRefNumber: string;
    token: string;
  }): Promise<boolean> {
    const now = new Date();
    const rows = await this.db
      .select()
      .from(abdmLinkOtps)
      .where(
        and(
          eq(abdmLinkOtps.iq_tenant_id, input.iqTenantId),
          eq(abdmLinkOtps.link_ref_number, input.linkRefNumber),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) return false;

    if (row.expires_at < now || row.attempts >= MAX_ATTEMPTS) {
      await this.db
        .delete(abdmLinkOtps)
        .where(
          and(
            eq(abdmLinkOtps.iq_tenant_id, input.iqTenantId),
            eq(abdmLinkOtps.link_ref_number, input.linkRefNumber),
          ),
        );
      return false;
    }

    const tokenHash = hashOtp(input.token);
    if (row.otp_hash !== tokenHash) {
      await this.db
        .update(abdmLinkOtps)
        .set({ attempts: row.attempts + 1 })
        .where(
          and(
            eq(abdmLinkOtps.iq_tenant_id, input.iqTenantId),
            eq(abdmLinkOtps.link_ref_number, input.linkRefNumber),
          ),
        );
      return false;
    }

    await this.db
      .delete(abdmLinkOtps)
      .where(
        and(
          eq(abdmLinkOtps.iq_tenant_id, input.iqTenantId),
          eq(abdmLinkOtps.link_ref_number, input.linkRefNumber),
        ),
      );
    return true;
  }

  /** Remove expired rows (optional startup / periodic hygiene). */
  async purgeExpired(): Promise<number> {
    const result = await this.db
      .delete(abdmLinkOtps)
      .where(lt(abdmLinkOtps.expires_at, new Date()));
    return result.rowCount ?? 0;
  }
}
