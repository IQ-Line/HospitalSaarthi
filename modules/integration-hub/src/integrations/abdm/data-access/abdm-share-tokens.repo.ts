import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq, gte, sql } from "@hims/ts-sdk-db";
import { abdmShareTokenIssuances, abdmShareTokens } from "../schema/tables.js";

export interface ScanShareTokenDoc {
  _id: string;
  token: number;
  aabha_address: string;
  patient_metadata: Record<string, unknown>;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShareTokensPort {
  listActive(input: {
    iqTenantId: string;
    facilityIdRef: string;
    aabhaAddress?: string;
    token?: number;
  }): Promise<{ docs: ScanShareTokenDoc[]; runningToken: number }>;
  findByToken(input: {
    iqTenantId: string;
    facilityIdRef: string;
    tokenId: number;
  }): Promise<ScanShareTokenDoc | null>;
  deactivate(input: {
    iqTenantId: string;
    facilityIdRef: string;
    tokenId: number;
  }): Promise<ScanShareTokenDoc | null>;
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function mapRow(row: typeof abdmShareTokenIssuances.$inferSelect): ScanShareTokenDoc {
  return {
    _id: row.id,
    token: row.token_number,
    aabha_address: row.abha_address,
    patient_metadata: row.patient_metadata ?? {},
    active: row.active,
    createdAt: row.issued_at,
    updatedAt: row.updated_at,
  };
}

export class DrizzleShareTokensRepo implements ShareTokensPort {
  constructor(private readonly db: DbInstance) {}

  private async runningTokenForToday(
    iqTenantId: string,
    facilityIdRef: string,
  ): Promise<number> {
    const issueDate = todayDateString();
    const counterRows = await this.db
      .select({ next: abdmShareTokens.next_token_number })
      .from(abdmShareTokens)
      .where(
        and(
          eq(abdmShareTokens.iq_tenant_id, iqTenantId),
          eq(abdmShareTokens.facility_id_ref, facilityIdRef),
          eq(abdmShareTokens.issue_date, issueDate),
        ),
      )
      .limit(1);
    const next = counterRows[0]?.next;
    if (typeof next === "number" && next > 1) {
      return next - 1;
    }
    const maxRows = await this.db
      .select({ max: sql<number>`max(${abdmShareTokenIssuances.token_number})` })
      .from(abdmShareTokenIssuances)
      .where(
        and(
          eq(abdmShareTokenIssuances.iq_tenant_id, iqTenantId),
          eq(abdmShareTokenIssuances.facility_id_ref, facilityIdRef),
          eq(abdmShareTokenIssuances.issue_date, issueDate),
        ),
      );
    const maxToken = maxRows[0]?.max;
    return typeof maxToken === "number" ? maxToken : 0;
  }

  async listActive(input: {
    iqTenantId: string;
    facilityIdRef: string;
    aabhaAddress?: string;
    token?: number;
  }): Promise<{ docs: ScanShareTokenDoc[]; runningToken: number }> {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const filters = [
      eq(abdmShareTokenIssuances.iq_tenant_id, input.iqTenantId),
      eq(abdmShareTokenIssuances.facility_id_ref, input.facilityIdRef),
      eq(abdmShareTokenIssuances.active, true),
      gte(abdmShareTokenIssuances.issued_at, since),
    ];
    if (input.aabhaAddress?.trim()) {
      filters.push(eq(abdmShareTokenIssuances.abha_address, input.aabhaAddress.trim()));
    }
    if (typeof input.token === "number" && !Number.isNaN(input.token)) {
      filters.push(eq(abdmShareTokenIssuances.token_number, input.token));
    }
    const rows = await this.db
      .select()
      .from(abdmShareTokenIssuances)
      .where(and(...filters))
      .orderBy(abdmShareTokenIssuances.token_number);
    const runningToken = await this.runningTokenForToday(
      input.iqTenantId,
      input.facilityIdRef,
    );
    return { docs: rows.map(mapRow), runningToken };
  }

  async findByToken(input: {
    iqTenantId: string;
    facilityIdRef: string;
    tokenId: number;
  }): Promise<ScanShareTokenDoc | null> {
    const issueDate = todayDateString();
    const rows = await this.db
      .select()
      .from(abdmShareTokenIssuances)
      .where(
        and(
          eq(abdmShareTokenIssuances.iq_tenant_id, input.iqTenantId),
          eq(abdmShareTokenIssuances.facility_id_ref, input.facilityIdRef),
          eq(abdmShareTokenIssuances.issue_date, issueDate),
          eq(abdmShareTokenIssuances.token_number, input.tokenId),
          eq(abdmShareTokenIssuances.active, true),
        ),
      )
      .limit(1);
    const row = rows[0];
    return row ? mapRow(row) : null;
  }

  async deactivate(input: {
    iqTenantId: string;
    facilityIdRef: string;
    tokenId: number;
  }): Promise<ScanShareTokenDoc | null> {
    const issueDate = todayDateString();
    const now = new Date();
    const rows = await this.db
      .update(abdmShareTokenIssuances)
      .set({ active: false, redeemed_at: now, updated_at: now })
      .where(
        and(
          eq(abdmShareTokenIssuances.iq_tenant_id, input.iqTenantId),
          eq(abdmShareTokenIssuances.facility_id_ref, input.facilityIdRef),
          eq(abdmShareTokenIssuances.issue_date, issueDate),
          eq(abdmShareTokenIssuances.token_number, input.tokenId),
          eq(abdmShareTokenIssuances.active, true),
        ),
      )
      .returning();
    const row = rows[0];
    return row ? mapRow(row) : null;
  }
}
