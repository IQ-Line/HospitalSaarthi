/**
 * Drizzle adapter for {@link ScanShareRepository} over `integration_hub`'s
 * `abdm_share_tokens` (per-facility/day counter) and `abdm_share_token_issuances`
 * (one row per handed-out token). SQL is ported verbatim from the pre-refactor
 * god-handler so token allocation, dedupe windows and redemption behave identically.
 * Time windows (`since`, `issueDate`, `expiresAt`) are computed by the use-cases
 * and passed in — this class holds no clock.
 */

import type { DbInstance } from "@hims/ts-sdk-db";
import { sql } from "@hims/ts-sdk-db";
import { INTEGRATION_HUB_SCHEMA_NAME } from "../schema/tables.js";
import type { ScanShareRepository, ShareIssuance } from "../use-cases/scan-share/ports.js";

const ISSUANCES = sql.raw(`${INTEGRATION_HUB_SCHEMA_NAME}.abdm_share_token_issuances`);
const TOKENS = sql.raw(`${INTEGRATION_HUB_SCHEMA_NAME}.abdm_share_tokens`);

/** Map a raw `execute` row (`Record<string, unknown>`) to the typed issuance shape. */
function rowToShareIssuance(row: Record<string, unknown>): ShareIssuance {
  const issuedAt = row["issued_at"];
  return {
    id: String(row["id"]),
    token_number: Number(row["token_number"]),
    abha_address: String(row["abha_address"]),
    profile_json: (row["profile_json"] ?? {}) as Record<string, unknown>,
    patient_id: row["patient_id"] == null ? null : String(row["patient_id"]),
    issued_at: issuedAt instanceof Date ? issuedAt : new Date(String(issuedAt)),
  };
}

export class DrizzleScanShareRepo implements ScanShareRepository {
  constructor(private readonly db: DbInstance) {}

  async tablesExist(): Promise<boolean> {
    try {
      await this.db.execute(sql`SELECT 1 FROM ${ISSUANCES} LIMIT 0`);
      return true;
    } catch {
      return false;
    }
  }

  async findActiveByAbha(input: {
    iqTenantId: string;
    facilityIdRef: string;
    abhaAddress: string;
    since: Date;
  }): Promise<ShareIssuance | null> {
    const result = await this.db.execute(sql`
      SELECT id, token_number, abha_address, profile_json, patient_id, issued_at
      FROM ${ISSUANCES}
      WHERE iq_tenant_id = ${input.iqTenantId}::uuid
        AND facility_id_ref = ${input.facilityIdRef}
        AND abha_address = ${input.abhaAddress}
        AND active = true
        AND redeemed_at IS NULL
        AND issued_at >= ${input.since}
      ORDER BY issued_at DESC
      LIMIT 1
    `);
    return (result.rows[0] as ShareIssuance | undefined) ?? null;
  }

  async allocateToken(input: {
    iqTenantId: string;
    integrationId: string;
    facilityIdRef: string;
    abhaAddress: string;
    profile: Record<string, unknown>;
    patientId: string | null;
    issueDate: string;
    expiresAt: Date;
  }): Promise<ShareIssuance> {
    const result = await this.db.execute(sql`
      WITH upserted AS (
        INSERT INTO ${TOKENS}
          (iq_tenant_id, integration_id, facility_id_ref, issue_date, next_token_number)
        VALUES (${input.iqTenantId}::uuid, ${input.integrationId}::uuid, ${input.facilityIdRef}, ${input.issueDate}::date, 2)
        ON CONFLICT (iq_tenant_id, facility_id_ref, issue_date)
        DO UPDATE SET next_token_number = integration_hub.abdm_share_tokens.next_token_number + 1
        RETURNING next_token_number - 1 AS token_number
      )
      INSERT INTO ${ISSUANCES}
        (iq_tenant_id, integration_id, facility_id_ref, issue_date, token_number, patient_id, abha_address, profile_json, expires_at)
      SELECT
        ${input.iqTenantId}::uuid,
        ${input.integrationId}::uuid,
        ${input.facilityIdRef},
        ${input.issueDate}::date,
        upserted.token_number,
        ${input.patientId ? sql`${input.patientId}::uuid` : sql`NULL`},
        ${input.abhaAddress},
        ${JSON.stringify(input.profile)}::jsonb,
        ${input.expiresAt}
      FROM upserted
      RETURNING id, token_number, abha_address, profile_json, patient_id, issued_at
    `);
    const row = result.rows[0];
    if (!row) {
      throw new Error("abdm_share_token_issuances insert returned no row");
    }
    return rowToShareIssuance(row);
  }

  async listActive(input: {
    iqTenantId: string;
    facilityIdRef: string;
    issueDate: string;
    since: Date;
  }): Promise<{ rows: ShareIssuance[]; runningToken: number }> {
    const result = await this.db.execute(sql`
      SELECT id, token_number, abha_address, profile_json, patient_id, issued_at
      FROM ${ISSUANCES}
      WHERE iq_tenant_id = ${input.iqTenantId}::uuid
        AND facility_id_ref = ${input.facilityIdRef}
        AND issue_date = ${input.issueDate}::date
        AND active = true
        AND redeemed_at IS NULL
        AND issued_at >= ${input.since}
      ORDER BY token_number ASC
    `);
    const running = await this.db.execute(sql`
      SELECT token_number
      FROM ${ISSUANCES}
      WHERE iq_tenant_id = ${input.iqTenantId}::uuid
        AND facility_id_ref = ${input.facilityIdRef}
        AND issue_date = ${input.issueDate}::date
        AND active = true
        AND redeemed_at IS NULL
        AND issued_at >= ${input.since}
      ORDER BY issued_at ASC
      LIMIT 1
    `);
    const runningRow = running.rows[0] as { token_number: number } | undefined;
    return {
      rows: result.rows.map(rowToShareIssuance),
      runningToken: runningRow?.token_number ?? 0,
    };
  }

  async findByToken(input: {
    iqTenantId: string;
    facilityIdRef: string;
    issueDate: string;
    tokenNumber: number;
    since: Date;
  }): Promise<ShareIssuance | null> {
    const result = await this.db.execute(sql`
      SELECT id, token_number, abha_address, profile_json, patient_id, issued_at
      FROM ${ISSUANCES}
      WHERE iq_tenant_id = ${input.iqTenantId}::uuid
        AND facility_id_ref = ${input.facilityIdRef}
        AND issue_date = ${input.issueDate}::date
        AND token_number = ${input.tokenNumber}
        AND active = true
        AND redeemed_at IS NULL
        AND issued_at >= ${input.since}
      LIMIT 1
    `);
    return (result.rows[0] as ShareIssuance | undefined) ?? null;
  }

  async findByQuery(input: {
    iqTenantId: string;
    facilityIdRef: string;
    issueDate: string;
    query: string;
    since: Date;
  }): Promise<ShareIssuance | null> {
    const numeric = Number.parseInt(input.query.trim(), 10);
    if (!Number.isNaN(numeric) && String(numeric) === input.query.trim()) {
      return this.findByToken({
        iqTenantId: input.iqTenantId,
        facilityIdRef: input.facilityIdRef,
        issueDate: input.issueDate,
        tokenNumber: numeric,
        since: input.since,
      });
    }
    const q = input.query.trim().toLowerCase();
    const result = await this.db.execute(sql`
      SELECT id, token_number, abha_address, profile_json, patient_id, issued_at
      FROM ${ISSUANCES}
      WHERE iq_tenant_id = ${input.iqTenantId}::uuid
        AND facility_id_ref = ${input.facilityIdRef}
        AND issue_date = ${input.issueDate}::date
        AND active = true
        AND redeemed_at IS NULL
        AND issued_at >= ${input.since}
        AND (
          lower(abha_address) LIKE ${`%${q}%`}
          OR lower(profile_json->>'abhaNumber') LIKE ${`%${q}%`}
        )
      ORDER BY issued_at DESC
      LIMIT 1
    `);
    return (result.rows[0] as ShareIssuance | undefined) ?? null;
  }

  async redeem(input: {
    iqTenantId: string;
    facilityIdRef: string;
    issueDate: string;
    tokenNumber: number;
  }): Promise<boolean> {
    const result = await this.db.execute(sql`
      UPDATE ${ISSUANCES}
      SET redeemed_at = now(), active = false
      WHERE iq_tenant_id = ${input.iqTenantId}::uuid
        AND facility_id_ref = ${input.facilityIdRef}
        AND issue_date = ${input.issueDate}::date
        AND token_number = ${input.tokenNumber}
        AND active = true
        AND redeemed_at IS NULL
      RETURNING id
    `);
    return result.rows.length > 0;
  }
}
