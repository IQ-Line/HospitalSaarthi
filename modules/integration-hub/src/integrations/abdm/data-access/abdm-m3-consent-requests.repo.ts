import type { DbInstance } from "@hims/ts-sdk-db";
import { and, desc, eq, ilike, inArray, lt, or, sql } from "@hims/ts-sdk-db";
import { abdmM3ConsentRequests } from "../schema/tables.js";
import type { M3ConsentRequestsPort, M3ConsentRequestRow } from "../ports.js";
import { M3Hiu } from "../lib/m3-fsm-states.js";

function rowToRecord(row: typeof abdmM3ConsentRequests.$inferSelect): M3ConsentRequestRow {
  return {
    iqTenantId: row.iq_tenant_id,
    consentRequestId: row.consent_request_id,
    sessionId: row.session_id,
    patientAbhaAddress: row.patient_abha_address,
    hipId: row.hip_id,
    purposeCode: row.purpose_code,
    hiTypes: row.hi_types ?? [],
    permissionDateFrom: row.permission_date_from,
    permissionDateTo: row.permission_date_to,
    dataEraseAt: row.data_erase_at,
    state: row.state as M3ConsentRequestRow["state"],
    consentArtefactIds: row.consent_artefact_ids ?? [],
    context: (row.context ?? {}) as Record<string, unknown>,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class DrizzleM3ConsentRequestsRepo implements M3ConsentRequestsPort {
  constructor(private readonly db: DbInstance) {}

  async insert(input: Omit<M3ConsentRequestRow, "createdAt" | "updatedAt">): Promise<void> {
    await this.db.insert(abdmM3ConsentRequests).values({
      iq_tenant_id: input.iqTenantId,
      consent_request_id: input.consentRequestId,
      session_id: input.sessionId,
      patient_abha_address: input.patientAbhaAddress,
      hip_id: input.hipId,
      purpose_code: input.purposeCode,
      hi_types: input.hiTypes,
      permission_date_from: input.permissionDateFrom,
      permission_date_to: input.permissionDateTo,
      data_erase_at: input.dataEraseAt,
      state: input.state,
      consent_artefact_ids: input.consentArtefactIds,
      context: input.context,
    });
  }

  async findByConsentRequestId(input: {
    iqTenantId: string;
    consentRequestId: string;
  }): Promise<M3ConsentRequestRow | null> {
    const rows = await this.db
      .select()
      .from(abdmM3ConsentRequests)
      .where(
        and(
          eq(abdmM3ConsentRequests.iq_tenant_id, input.iqTenantId),
          eq(abdmM3ConsentRequests.consent_request_id, input.consentRequestId),
        ),
      )
      .limit(1);
    return rows[0] ? rowToRecord(rows[0]) : null;
  }

  async findBySessionId(input: {
    iqTenantId: string;
    sessionId: string;
  }): Promise<M3ConsentRequestRow | null> {
    const rows = await this.db
      .select()
      .from(abdmM3ConsentRequests)
      .where(
        and(
          eq(abdmM3ConsentRequests.iq_tenant_id, input.iqTenantId),
          eq(abdmM3ConsentRequests.session_id, input.sessionId),
        ),
      )
      .limit(1);
    return rows[0] ? rowToRecord(rows[0]) : null;
  }

  async patch(input: {
    iqTenantId: string;
    consentRequestId: string;
    state?: string;
    consentArtefactIds?: string[];
    contextMerge?: Record<string, unknown>;
  }): Promise<void> {
    const existing = await this.findByConsentRequestId({
      iqTenantId: input.iqTenantId,
      consentRequestId: input.consentRequestId,
    });
    if (!existing) return;
    const mergedContext = {
      ...existing.context,
      ...(input.contextMerge ?? {}),
    };
    await this.db
      .update(abdmM3ConsentRequests)
      .set({
        ...(input.state ? { state: input.state } : {}),
        ...(input.consentArtefactIds
          ? { consent_artefact_ids: input.consentArtefactIds }
          : {}),
        context: mergedContext,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(abdmM3ConsentRequests.iq_tenant_id, input.iqTenantId),
          eq(abdmM3ConsentRequests.consent_request_id, input.consentRequestId),
        ),
      );
  }

  async listActive(iqTenantId: string): Promise<M3ConsentRequestRow[]> {
    const rows = await this.db
      .select()
      .from(abdmM3ConsentRequests)
      .where(eq(abdmM3ConsentRequests.iq_tenant_id, iqTenantId));
    return rows
      .filter((r) =>
        new Set<string>([M3Hiu.CONSENT_INIT_REQUESTED, M3Hiu.AWAITING_PATIENT_APPROVAL]).has(
          r.state,
        ),
      )
      .map(rowToRecord);
  }

  async searchForTenant(input: {
    iqTenantId: string;
    name?: string;
    from?: Date;
    to?: Date;
    drName?: string;
    hiTypes?: string[];
    status?: string;
    page: number;
    limit: number;
  }): Promise<{ rows: M3ConsentRequestRow[]; totalCount: number }> {
    const conditions = [eq(abdmM3ConsentRequests.iq_tenant_id, input.iqTenantId)];

    const name = input.name?.trim();
    if (name) {
      const pattern = `%${name}%`;
      conditions.push(
        or(
          ilike(abdmM3ConsentRequests.patient_abha_address, pattern),
          sql`${abdmM3ConsentRequests.context}->>'patientName' ILIKE ${pattern}`,
        )!,
      );
    }

    const drName = input.drName?.trim();
    if (drName) {
      const drNamePattern = `%${drName}%`;
      conditions.push(
        sql`${abdmM3ConsentRequests.context}->>'requesterName' ILIKE ${drNamePattern}`,
      );
    }

    if (input.from) {
      conditions.push(sql`${abdmM3ConsentRequests.created_at} >= ${input.from}`);
    }
    if (input.to) {
      conditions.push(sql`${abdmM3ConsentRequests.created_at} <= ${input.to}`);
    }

    if (input.hiTypes?.length) {
      conditions.push(
        sql`${abdmM3ConsentRequests.hi_types} && ARRAY[${sql.join(
          input.hiTypes.map((t) => sql`${t}`),
          sql`, `,
        )}]::text[]`,
      );
    }

    const status = input.status?.trim().toLowerCase();
    if (status === "requested") {
      conditions.push(
        inArray(abdmM3ConsentRequests.state, [
          M3Hiu.CONSENT_INIT_REQUESTED,
          M3Hiu.AWAITING_PATIENT_APPROVAL,
        ]),
      );
    } else if (status === "granted") {
      conditions.push(
        and(
          inArray(abdmM3ConsentRequests.state, [
            M3Hiu.CONSENT_GRANTED,
            M3Hiu.DATA_REQUESTED,
            M3Hiu.AWAITING_PUSH,
            M3Hiu.BUNDLES_RECEIVED,
            M3Hiu.BUNDLES_DECRYPTED,
            M3Hiu.RECORDS_INGESTED,
            M3Hiu.ACKNOWLEDGED,
          ]),
          sql`${abdmM3ConsentRequests.data_erase_at} >= NOW()`,
        )!,
      );
    } else if (status === "denied") {
      conditions.push(
        and(
          eq(abdmM3ConsentRequests.state, M3Hiu.CONSENT_DENIED),
          sql`COALESCE(${abdmM3ConsentRequests.context}->'error'->>'code', '') <> 'REVOKED'`,
        )!,
      );
    } else if (status === "revoked") {
      conditions.push(
        and(
          eq(abdmM3ConsentRequests.state, M3Hiu.CONSENT_DENIED),
          sql`${abdmM3ConsentRequests.context}->'error'->>'code' = 'REVOKED'`,
        )!,
      );
    } else if (status === "expired") {
      conditions.push(
        or(
          eq(abdmM3ConsentRequests.state, M3Hiu.EXPIRED),
          and(
            inArray(abdmM3ConsentRequests.state, [
              M3Hiu.CONSENT_GRANTED,
              M3Hiu.DATA_REQUESTED,
              M3Hiu.AWAITING_PUSH,
              M3Hiu.BUNDLES_RECEIVED,
              M3Hiu.BUNDLES_DECRYPTED,
              M3Hiu.RECORDS_INGESTED,
              M3Hiu.ACKNOWLEDGED,
            ]),
            sql`${abdmM3ConsentRequests.data_erase_at} < NOW()`,
          )!,
        )!,
      );
    }

    const where = and(...conditions);
    const offset = Math.max(0, (input.page - 1) * input.limit);

    const [rows, countRows] = await Promise.all([
      this.db
        .select()
        .from(abdmM3ConsentRequests)
        .where(where)
        .orderBy(desc(abdmM3ConsentRequests.created_at))
        .limit(input.limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(abdmM3ConsentRequests)
        .where(where),
    ]);

    return {
      rows: rows.map(rowToRecord),
      totalCount: countRows[0]?.count ?? 0,
    };
  }

  async janitor(): Promise<number> {
    const hours = Number(process.env["ABDM_M3_CONSENT_REQUEST_EXPIRY_HOURS"] ?? 72);
    const cutoff = new Date(Date.now() - hours * 3600000);
    const result = await this.db
      .update(abdmM3ConsentRequests)
      .set({ state: M3Hiu.EXPIRED, updated_at: new Date() })
      .where(
        and(
          eq(abdmM3ConsentRequests.state, M3Hiu.AWAITING_PATIENT_APPROVAL),
          lt(abdmM3ConsentRequests.created_at, cutoff),
        ),
      )
      .returning({ consent_request_id: abdmM3ConsentRequests.consent_request_id });
    return result.length;
  }
}
