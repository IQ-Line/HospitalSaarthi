import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq, gt, isNotNull, lt, sql } from "@hims/ts-sdk-db";
import { abdmLinkTokens } from "../schema/tables.js";
import type { LinkTokensPort } from "../ports.js";

const FRESH_BUFFER_MS = 60_000;
const PENDING_GRACE_MS = 30_000;

export class DrizzleLinkTokensRepo implements LinkTokensPort {
  constructor(private readonly db: DbInstance) {}

  async findFresh(
    iqTenantId: string,
    abhaAddress: string,
  ): Promise<{ linkToken: string; expiresAt: Date } | null> {
    const minExp = new Date(Date.now() + FRESH_BUFFER_MS);
    const rows = await this.db
      .select()
      .from(abdmLinkTokens)
      .where(
        and(
          eq(abdmLinkTokens.iq_tenant_id, iqTenantId),
          eq(abdmLinkTokens.abha_address, abhaAddress),
          isNotNull(abdmLinkTokens.link_token),
          gt(abdmLinkTokens.expires_at, minExp),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row?.link_token || !row.expires_at) return null;
    return { linkToken: row.link_token, expiresAt: row.expires_at };
  }

  async claimAcquisition(
    iqTenantId: string,
    abhaAddress: string,
    requestId: string,
  ): Promise<"claimed" | "fresh-exists" | "another-in-flight"> {
    const fresh = await this.findFresh(iqTenantId, abhaAddress);
    if (fresh) return "fresh-exists";

    const pendingUntil = new Date(Date.now() + PENDING_GRACE_MS);
    const result = await this.db.execute(sql`
      INSERT INTO abdm_adapter.abdm_link_tokens
        (iq_tenant_id, abha_address, pending_request_id, pending_expires_at)
      VALUES (${iqTenantId}::uuid, ${abhaAddress}, ${requestId}, ${pendingUntil})
      ON CONFLICT (iq_tenant_id, abha_address) DO UPDATE
        SET pending_request_id = EXCLUDED.pending_request_id,
            pending_expires_at = EXCLUDED.pending_expires_at,
            link_token = NULL,
            expires_at = NULL
        WHERE (
          (
            abdm_adapter.abdm_link_tokens.link_token IS NULL
            AND (
              abdm_adapter.abdm_link_tokens.pending_expires_at IS NULL
              OR abdm_adapter.abdm_link_tokens.pending_expires_at < now()
            )
          )
          OR (
            abdm_adapter.abdm_link_tokens.link_token IS NOT NULL
            AND abdm_adapter.abdm_link_tokens.expires_at <= now() + interval '60 seconds'
          )
        )
        AND NOT (
          abdm_adapter.abdm_link_tokens.link_token IS NOT NULL
          AND abdm_adapter.abdm_link_tokens.expires_at > now() + interval '60 seconds'
        )
      RETURNING pending_request_id
    `);

    const rows = result.rows as { pending_request_id: string }[];
    if (rows.length === 0) {
      const again = await this.findFresh(iqTenantId, abhaAddress);
      return again ? "fresh-exists" : "another-in-flight";
    }
    return rows[0]!.pending_request_id === requestId ? "claimed" : "another-in-flight";
  }

  async completeAcquisition(
    iqTenantId: string,
    abhaAddress: string,
    encryptedToken: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.db
      .insert(abdmLinkTokens)
      .values({
        iq_tenant_id: iqTenantId,
        abha_address: abhaAddress,
        link_token: encryptedToken,
        expires_at: expiresAt,
        obtained_at: new Date(),
        pending_request_id: null,
        pending_expires_at: null,
      })
      .onConflictDoUpdate({
        target: [abdmLinkTokens.iq_tenant_id, abdmLinkTokens.abha_address],
        set: {
          link_token: encryptedToken,
          expires_at: expiresAt,
          obtained_at: new Date(),
          pending_request_id: null,
          pending_expires_at: null,
        },
      });
  }

  async invalidate(iqTenantId: string, abhaAddress: string): Promise<void> {
    await this.db
      .delete(abdmLinkTokens)
      .where(
        and(
          eq(abdmLinkTokens.iq_tenant_id, iqTenantId),
          eq(abdmLinkTokens.abha_address, abhaAddress),
        ),
      );
  }

  async janitor(): Promise<number> {
    const result = await this.db
      .delete(abdmLinkTokens)
      .where(
        and(
          isNotNull(abdmLinkTokens.expires_at),
          lt(abdmLinkTokens.expires_at, new Date()),
        ),
      )
      .returning({ abha_address: abdmLinkTokens.abha_address });
    return result.length;
  }

  async findByPendingOrAddress(
    iqTenantId: string,
    abhaAddress: string,
  ): Promise<{ encryptedToken: string | null } | null> {
    const rows = await this.db
      .select()
      .from(abdmLinkTokens)
      .where(
        and(
          eq(abdmLinkTokens.iq_tenant_id, iqTenantId),
          eq(abdmLinkTokens.abha_address, abhaAddress),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return { encryptedToken: row.link_token };
  }
}
