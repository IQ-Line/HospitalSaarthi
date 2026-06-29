import type { FastifyInstance, FastifyReply } from "fastify";
import type { DbInstance } from "@hims/ts-sdk-db";
import { sql } from "@hims/ts-sdk-db";
import type { IntegrationHubSharedInfra } from "../../../lib/build-abdm-deps.js";
import { buildAbdmDepsForTenant } from "../../../lib/build-abdm-deps.js";
import type { GatewayClient } from "../ports.js";
import { runInboundCallback } from "./m2/m2-inbound-helper.js";
import { INTEGRATION_HUB_SCHEMA_NAME } from "../schema/tables.js";

const ACTIVE_WINDOW_MS = 60 * 60 * 1000;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

type ShareProfileJson = Record<string, unknown>;

type IssuanceRow = {
  id: string;
  token_number: number;
  abha_address: string;
  profile_json: ShareProfileJson;
  patient_id: string | null;
  issued_at: Date;
};

function istIssueDate(): string {
  const d = new Date(Date.now() + IST_OFFSET_MS);
  return d.toISOString().slice(0, 10);
}

function endOfIstDay(): Date {
  const day = istIssueDate();
  return new Date(`${day}T23:59:59.999+05:30`);
}

function parseSharePatient(body: unknown): {
  abhaAddress: string;
  profile: ShareProfileJson;
} | null {
  const root = body as {
    profile?: { patient?: Record<string, unknown> };
  };
  const patient = root.profile?.patient;
  const abhaAddress = String(patient?.abhaAddress ?? "").trim();
  if (!patient || !abhaAddress) return null;
  return { abhaAddress, profile: patient };
}

function mapGender(raw: unknown): "male" | "female" | "other" | "" {
  const g = String(raw ?? "").toLowerCase();
  if (g === "m" || g === "male") return "male";
  if (g === "f" || g === "female") return "female";
  if (g) return "other";
  return "";
}

function parseName(fullName: string): {
  first_name: string;
  middle_name: string | null;
  last_name: string | null;
} {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: "", middle_name: null, last_name: null };
  if (parts.length === 1) return { first_name: parts[0]!, middle_name: null, last_name: null };
  return {
    first_name: parts[0]!,
    middle_name: parts.length > 2 ? parts.slice(1, -1).join(" ") : null,
    last_name: parts[parts.length - 1]!,
  };
}

function birthDateFromProfile(profile: ShareProfileJson): string | null {
  const y = profile.yearOfBirth;
  const m = profile.monthOfBirth;
  const d = profile.dayOfBirth;
  if (y == null || m == null || d == null) return null;
  const yy = String(y).padStart(4, "0");
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function ageYearsFromProfile(profile: ShareProfileJson, birthDate: string | null): number | null {
  if (birthDate) {
    const dob = new Date(`${birthDate}T00:00:00+05:30`);
    const now = new Date(Date.now() + IST_OFFSET_MS);
    let age = now.getUTCFullYear() - dob.getUTCFullYear();
    const m = now.getUTCMonth() - dob.getUTCMonth();
    if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) age -= 1;
    return age >= 0 ? age : null;
  }
  const age = profile.age;
  return typeof age === "number" ? age : null;
}

function addressFromProfile(profile: ShareProfileJson): {
  line1: string;
  city: string;
  state: string;
  district: string;
  pincode: string;
} {
  const addr = (profile.address ?? {}) as Record<string, unknown>;
  return {
    line1: String(addr.line ?? profile.addressLine ?? "").trim(),
    city: String(addr.city ?? profile.city ?? "").trim(),
    state: String(addr.state ?? profile.state ?? "").trim(),
    district: String(addr.district ?? profile.district ?? "").trim(),
    pincode: String(addr.pincode ?? profile.pin ?? profile.pincode ?? "").trim(),
  };
}

export function buildRegistrationPrefill(profile: ShareProfileJson): Record<string, unknown> {
  const fullName = String(profile.name ?? profile.fullName ?? "").trim();
  const names = parseName(fullName);
  const birthDate = birthDateFromProfile(profile);
  const ageYears = ageYearsFromProfile(profile, birthDate);
  const addr = addressFromProfile(profile);
  const addressBlock = {
    line1: addr.line1,
    line2: "",
    city: addr.city,
    state: addr.state,
    district: addr.district,
    pincode: addr.pincode,
  };
  return {
    patient: {
      phone: String(profile.phoneNumber ?? profile.phone ?? "").trim(),
      first_name: names.first_name,
      middle_name: names.middle_name,
      last_name: names.last_name,
      gender: mapGender(profile.gender),
      date_of_birth: birthDate,
      age_years: ageYears,
      age_months: birthDate ? 0 : null,
      age_days: birthDate ? 0 : null,
      abha_number: String(profile.abhaNumber ?? profile.aabha_uhid ?? "").trim() || null,
      abha_address: String(profile.abhaAddress ?? profile.aabha_address ?? "").trim() || null,
    },
    permanent_address: addressBlock,
    residential_address: addressBlock,
    residential_same_as_permanent: true,
  };
}

function listPatientSummary(row: IssuanceRow): Record<string, unknown> {
  const profile = row.profile_json ?? {};
  const fullName = String(profile.name ?? profile.fullName ?? "").trim();
  const birthDate = birthDateFromProfile(profile);
  return {
    token_number: row.token_number,
    patient_name: fullName,
    phone_number: String(profile.phoneNumber ?? profile.phone ?? "").trim(),
    abha_address: row.abha_address,
    abha_number: String(profile.abhaNumber ?? profile.aabha_uhid ?? "").trim(),
    age_years: ageYearsFromProfile(profile, birthDate),
    gender: mapGender(profile.gender),
  };
}

async function findActiveByAbha(
  db: DbInstance,
  iqTenantId: string,
  facilityIdRef: string,
  abhaAddress: string,
): Promise<IssuanceRow | null> {
  const since = new Date(Date.now() - ACTIVE_WINDOW_MS);
  const result = await db.execute(sql`
    SELECT id, token_number, abha_address, profile_json, patient_id, issued_at
    FROM ${sql.raw(`${INTEGRATION_HUB_SCHEMA_NAME}.abdm_share_token_issuances`)}
    WHERE iq_tenant_id = ${iqTenantId}::uuid
      AND facility_id_ref = ${facilityIdRef}
      AND abha_address = ${abhaAddress}
      AND active = true
      AND redeemed_at IS NULL
      AND issued_at >= ${since}
    ORDER BY issued_at DESC
    LIMIT 1
  `);
  const row = result.rows[0] as IssuanceRow | undefined;
  return row ?? null;
}

async function allocateToken(
  db: DbInstance,
  input: {
    iqTenantId: string;
    integrationId: string;
    facilityIdRef: string;
    abhaAddress: string;
    profile: ShareProfileJson;
    patientId: string | null;
  },
): Promise<IssuanceRow> {
  const issueDate = istIssueDate();
  const expiresAt = endOfIstDay();
  const result = await db.execute(sql`
    WITH upserted AS (
      INSERT INTO ${sql.raw(`${INTEGRATION_HUB_SCHEMA_NAME}.abdm_share_tokens`)}
        (iq_tenant_id, integration_id, facility_id_ref, issue_date, next_token_number)
      VALUES (${input.iqTenantId}::uuid, ${input.integrationId}::uuid, ${input.facilityIdRef}, ${issueDate}::date, 2)
      ON CONFLICT (iq_tenant_id, facility_id_ref, issue_date)
      DO UPDATE SET next_token_number = integration_hub.abdm_share_tokens.next_token_number + 1
      RETURNING next_token_number - 1 AS token_number
    )
    INSERT INTO ${sql.raw(`${INTEGRATION_HUB_SCHEMA_NAME}.abdm_share_token_issuances`)}
      (iq_tenant_id, integration_id, facility_id_ref, issue_date, token_number, patient_id, abha_address, profile_json, expires_at)
    SELECT
      ${input.iqTenantId}::uuid,
      ${input.integrationId}::uuid,
      ${input.facilityIdRef},
      ${issueDate}::date,
      upserted.token_number,
      ${input.patientId ? sql`${input.patientId}::uuid` : sql`NULL`},
      ${input.abhaAddress},
      ${JSON.stringify(input.profile)}::jsonb,
      ${expiresAt}
    FROM upserted
    RETURNING id, token_number, abha_address, profile_json, patient_id, issued_at
  `);
  return result.rows[0] as IssuanceRow;
}

async function acknowledgeShare(input: {
  gateway: GatewayClient;
  requestId: string;
  abhaAddress: string;
  tokenNumber: number;
  counterId: number;
  xCmId: string;
  errorStatus?: boolean;
}): Promise<void> {
  const body = input.errorStatus
    ? {
        error: {
          code: "ABDM-9999: ",
          message: "Token Already generated for the patient",
        },
        response: { requestId: input.requestId },
      }
    : {
        acknowledgement: {
          abhaAddress: input.abhaAddress,
          status: "SUCCESS",
          profile: {
            context: input.counterId,
            tokenNumber: input.tokenNumber,
            expiry: 1800,
          },
        },
        response: { requestId: input.requestId },
      };
  await input.gateway.post({
    path: "/api/hiecm/patient-share/v3/on-share",
    body,
    target: "gateway",
    requestId: input.requestId,
    headers: { "X-CM-ID": input.xCmId },
  });
}

async function listActiveIssuances(
  db: DbInstance,
  iqTenantId: string,
  facilityIdRef: string,
): Promise<{ patients: Record<string, unknown>[]; running_token: number }> {
  const since = new Date(Date.now() - ACTIVE_WINDOW_MS);
  const issueDate = istIssueDate();
  const result = await db.execute(sql`
    SELECT id, token_number, abha_address, profile_json, patient_id, issued_at
    FROM ${sql.raw(`${INTEGRATION_HUB_SCHEMA_NAME}.abdm_share_token_issuances`)}
    WHERE iq_tenant_id = ${iqTenantId}::uuid
      AND facility_id_ref = ${facilityIdRef}
      AND issue_date = ${issueDate}::date
      AND active = true
      AND redeemed_at IS NULL
      AND issued_at >= ${since}
    ORDER BY token_number ASC
  `);
  const rows = result.rows as IssuanceRow[];
  const running = await db.execute(sql`
    SELECT token_number
    FROM ${sql.raw(`${INTEGRATION_HUB_SCHEMA_NAME}.abdm_share_token_issuances`)}
    WHERE iq_tenant_id = ${iqTenantId}::uuid
      AND facility_id_ref = ${facilityIdRef}
      AND issue_date = ${issueDate}::date
      AND active = true
      AND redeemed_at IS NULL
      AND issued_at >= ${since}
    ORDER BY issued_at ASC
    LIMIT 1
  `);
  const runningRow = running.rows[0] as { token_number: number } | undefined;
  return {
    patients: rows.map(listPatientSummary),
    running_token: runningRow?.token_number ?? 0,
  };
}

async function findIssuanceByToken(
  db: DbInstance,
  iqTenantId: string,
  facilityIdRef: string,
  tokenNumber: number,
): Promise<IssuanceRow | null> {
  const since = new Date(Date.now() - ACTIVE_WINDOW_MS);
  const issueDate = istIssueDate();
  const result = await db.execute(sql`
    SELECT id, token_number, abha_address, profile_json, patient_id, issued_at
    FROM ${sql.raw(`${INTEGRATION_HUB_SCHEMA_NAME}.abdm_share_token_issuances`)}
    WHERE iq_tenant_id = ${iqTenantId}::uuid
      AND facility_id_ref = ${facilityIdRef}
      AND issue_date = ${issueDate}::date
      AND token_number = ${tokenNumber}
      AND active = true
      AND redeemed_at IS NULL
      AND issued_at >= ${since}
    LIMIT 1
  `);
  return (result.rows[0] as IssuanceRow | undefined) ?? null;
}

async function findIssuanceByQuery(
  db: DbInstance,
  iqTenantId: string,
  facilityIdRef: string,
  query: string,
): Promise<IssuanceRow | null> {
  const numeric = Number.parseInt(query.trim(), 10);
  if (!Number.isNaN(numeric) && String(numeric) === query.trim()) {
    return findIssuanceByToken(db, iqTenantId, facilityIdRef, numeric);
  }
  const since = new Date(Date.now() - ACTIVE_WINDOW_MS);
  const issueDate = istIssueDate();
  const q = query.trim().toLowerCase();
  const result = await db.execute(sql`
    SELECT id, token_number, abha_address, profile_json, patient_id, issued_at
    FROM ${sql.raw(`${INTEGRATION_HUB_SCHEMA_NAME}.abdm_share_token_issuances`)}
    WHERE iq_tenant_id = ${iqTenantId}::uuid
      AND facility_id_ref = ${facilityIdRef}
      AND issue_date = ${issueDate}::date
      AND active = true
      AND redeemed_at IS NULL
      AND issued_at >= ${since}
      AND (
        lower(abha_address) LIKE ${`%${q}%`}
        OR lower(profile_json->>'abhaNumber') LIKE ${`%${q}%`}
      )
    ORDER BY issued_at DESC
    LIMIT 1
  `);
  return (result.rows[0] as IssuanceRow | undefined) ?? null;
}

async function redeemToken(
  db: DbInstance,
  iqTenantId: string,
  facilityIdRef: string,
  tokenNumber: number,
): Promise<boolean> {
  const issueDate = istIssueDate();
  const result = await db.execute(sql`
    UPDATE ${sql.raw(`${INTEGRATION_HUB_SCHEMA_NAME}.abdm_share_token_issuances`)}
    SET redeemed_at = now(), active = false
    WHERE iq_tenant_id = ${iqTenantId}::uuid
      AND facility_id_ref = ${facilityIdRef}
      AND issue_date = ${issueDate}::date
      AND token_number = ${tokenNumber}
      AND active = true
      AND redeemed_at IS NULL
    RETURNING id
  `);
  return result.rows.length > 0;
}

function qrValue(profile: { hipId: string; hipDisplayName: string | null; gatewayEnvironment: string }): {
  qr_value: string;
  is_live: boolean;
} {
  const hipId = profile.hipId.trim();
  const isLive = profile.gatewayEnvironment === "production";
  const counterId = "1";
  if (isLive) {
    return {
      is_live: true,
      qr_value: JSON.stringify({
        hipId,
        code: counterId,
        facilityName: profile.hipDisplayName ?? "",
      }),
    };
  }
  const base = "https://phrsbx.abdm.gov.in";
  return {
    is_live: false,
    qr_value: `${base}/share-profile?hip-id=${encodeURIComponent(hipId)}&counter-id=${counterId}`,
  };
}

type ScanShareStatusData = {
  available: boolean;
  reason?: string;
  hip_id?: string;
  facility_name?: string | null;
  qr_value?: string;
  is_live?: boolean;
};

async function resolveScanShareStatus(
  shared: IntegrationHubSharedInfra,
  ctx: { profile: { hipId: string; hipDisplayName: string | null; gatewayEnvironment: string } },
): Promise<ScanShareStatusData> {
  const hipId = ctx.profile.hipId?.trim();
  if (!hipId) {
    return {
      available: false,
      reason:
        "ABDM HIP ID is not configured for this facility. Add an active integration profile in Configurator.",
    };
  }

  if (!shared.db) {
    return {
      available: false,
      hip_id: hipId,
      reason: "Integration Hub database is not connected.",
    };
  }

  try {
    await shared.db.execute(sql`
      SELECT 1
      FROM ${sql.raw(`${INTEGRATION_HUB_SCHEMA_NAME}.abdm_share_token_issuances`)}
      LIMIT 0
    `);
  } catch {
    return {
      available: false,
      hip_id: hipId,
      reason:
        "Scan-and-share tables are missing. Apply modules/integration-hub/migrations/0005_abdm_scan_share.sql.",
    };
  }

  const qr = qrValue({
    hipId,
    hipDisplayName: ctx.profile.hipDisplayName,
    gatewayEnvironment: ctx.profile.gatewayEnvironment,
  });

  return {
    available: true,
    hip_id: hipId,
    facility_name: ctx.profile.hipDisplayName,
    qr_value: qr.qr_value,
    is_live: qr.is_live,
  };
}

function requireDb(shared: IntegrationHubSharedInfra): DbInstance {
  if (!shared.db) {
    throw new Error("integration hub database is not configured");
  }
  return shared.db;
}

export async function registerScanShareCallbackRoutes(
  app: FastifyInstance,
  sharedInfra: IntegrationHubSharedInfra,
): Promise<void> {
  app.post("/hip/patient/share", async (req, reply) => {
    await runInboundCallback({
      req,
      reply,
      flowKind: "abdm.scan-and-share.v1",
      httpStatus: 200,
      sharedInfra,
      handler: async ({ iqTenantId, requestId, body, deps }) => {
        const db = requireDb(sharedInfra);
        const parsed = parseSharePatient(body);
        if (!parsed) {
          throw new Error("invalid scan-and-share profile payload");
        }
        const facilityIdRef = deps.xHipId;
        const integrationCtx = await buildAbdmDepsForTenant(iqTenantId, sharedInfra);
        const integrationId = integrationCtx.profile.id;

        const existing = await findActiveByAbha(db, iqTenantId, facilityIdRef, parsed.abhaAddress);
        if (existing) {
          await acknowledgeShare({
            gateway: deps.gateway,
            requestId,
            abhaAddress: parsed.abhaAddress,
            tokenNumber: existing.token_number,
            counterId: 1,
            xCmId: deps.xCmId,
            errorStatus: true,
          });
          return;
        }

        let patientId: string | null = null;
        try {
          const empiHit = await deps.empi.findPatientByAbhaAddress({
            iqTenantId,
            abhaAddress: parsed.abhaAddress,
          });
          patientId = empiHit?.patientId ?? null;
        } catch {
          patientId = null;
        }

        const issuance = await allocateToken(db, {
          iqTenantId,
          integrationId,
          facilityIdRef,
          abhaAddress: parsed.abhaAddress,
          profile: parsed.profile,
          patientId,
        });

        await acknowledgeShare({
          gateway: deps.gateway,
          requestId,
          abhaAddress: parsed.abhaAddress,
          tokenNumber: issuance.token_number,
          counterId: 1,
          xCmId: deps.xCmId,
        });
      },
    });
  });
}

export async function registerScanShareRoutes(app: FastifyInstance): Promise<void> {
  app.get("/scan-share/status", async (req, reply: FastifyReply) => {
    const ctx = req.integrationCtx!;
    const shared = req.server.integrationHubSharedInfra!;
    const data = await resolveScanShareStatus(shared, ctx);
    return reply.send({ data, message: "ok" });
  });

  app.get("/scan-share/active", async (req, reply: FastifyReply) => {
    const ctx = req.integrationCtx!;
    const shared = req.server.integrationHubSharedInfra!;
    const db = requireDb(shared);
    const data = await listActiveIssuances(db, ctx.iqTenantId, ctx.deps.xHipId);
    return reply.send({ data, message: "ok" });
  });

  app.get("/scan-share/qr", async (req, reply: FastifyReply) => {
    const ctx = req.integrationCtx!;
    const shared = req.server.integrationHubSharedInfra!;
    const status = await resolveScanShareStatus(shared, ctx);
    if (!status.available || !status.qr_value) {
      return reply.status(503).send({
        error: "ServiceUnavailable",
        message: status.reason ?? "Scan-and-share is not available",
      });
    }
    return reply.send({
      data: { qr_value: status.qr_value, is_live: status.is_live ?? false },
      message: "ok",
    });
  });

  app.get("/scan-share/lookup", async (req, reply: FastifyReply) => {
    const ctx = req.integrationCtx!;
    const shared = req.server.integrationHubSharedInfra!;
    const db = requireDb(shared);
    const q = String((req.query as { q?: string }).q ?? "").trim();
    if (!q) {
      return reply.status(400).send({ error: "BadRequest", message: "q is required" });
    }
    const row = await findIssuanceByQuery(db, ctx.iqTenantId, ctx.deps.xHipId, q);
    if (!row) {
      return reply.status(404).send({ error: "NotFound", message: "No active token found" });
    }
    return reply.send({
      data: {
        token_number: row.token_number,
        summary: listPatientSummary(row),
        prefill: buildRegistrationPrefill(row.profile_json),
        freeze_abha: true,
      },
      message: "ok",
    });
  });

  app.get("/scan-share/token/:tokenNumber/prefill", async (req, reply: FastifyReply) => {
    const ctx = req.integrationCtx!;
    const shared = req.server.integrationHubSharedInfra!;
    const db = requireDb(shared);
    const tokenNumber = Number((req.params as { tokenNumber: string }).tokenNumber);
    if (!Number.isFinite(tokenNumber)) {
      return reply.status(400).send({ error: "BadRequest", message: "invalid token number" });
    }
    const row = await findIssuanceByToken(db, ctx.iqTenantId, ctx.deps.xHipId, tokenNumber);
    if (!row) {
      return reply.status(404).send({ error: "NotFound", message: "No active token found" });
    }
    return reply.send({
      data: {
        token_number: row.token_number,
        summary: listPatientSummary(row),
        prefill: buildRegistrationPrefill(row.profile_json),
        freeze_abha: true,
      },
      message: "ok",
    });
  });

  app.put("/scan-share/token/:tokenNumber/redeem", async (req, reply: FastifyReply) => {
    const ctx = req.integrationCtx!;
    const shared = req.server.integrationHubSharedInfra!;
    const db = requireDb(shared);
    const tokenNumber = Number((req.params as { tokenNumber: string }).tokenNumber);
    if (!Number.isFinite(tokenNumber)) {
      return reply.status(400).send({ error: "BadRequest", message: "invalid token number" });
    }
    const ok = await redeemToken(db, ctx.iqTenantId, ctx.deps.xHipId, tokenNumber);
    if (!ok) {
      return reply.status(404).send({ error: "NotFound", message: "Token not found or already redeemed" });
    }
    return reply.send({ data: { token_number: tokenNumber, redeemed: true }, message: "ok" });
  });
}
