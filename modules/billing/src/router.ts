import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { and, eq, sql, type DbInstance } from "@hims/ts-sdk-db";
import { createConsultationTypesRepo } from "./data-access/consultation-types.repository.js";
import { createTariffMasterRepo } from "./data-access/tariff-master.repository.js";
import {
  createPermissiveConsultationTariffReferenceValidator,
  type ConsultationTariffReferenceValidator,
} from "./ports.js";
import type { TariffMasterRow } from "./domain/tariff-master.types.js";
import { formatMoney, parseEffectiveWindow, toTariffRow } from "./lib/tariff-api.js";
import { createBillingRepo, createInMemoryBillingRepo } from "./data-access/billing.repository.js";
import { seedMockBills } from "./lib/mock-bills.js";
import { registerBillingHandlers } from "./rest-handlers/billing.handlers.js";
import { registerProviderConsultationTariffHandlers } from "./rest-handlers/provider-consultation-tariffs.handler.js";
import { registerUpdateServiceHandler } from "./rest-handlers/update-service.handler.js";
import { billingMaster } from "./schema/tables.js";
import {
  createTariffService,
  toInsertValues,
} from "./use-cases/create-tariff-service.js";
import { sendUseCaseResult } from "./lib/handler-result.js";

export interface BillingRouterOptions {
  db?: DbInstance;
  /** Return in-memory sample rows (no DB). Default off; set BILLING_USE_MOCK_DATA=true in billing-svc. */
  useMock?: boolean;
  /** Provider/department existence checks for consultation tariffs (defaults to permissive). */
  referenceValidator?: ConsultationTariffReferenceValidator;
}

type ListQuery = {
  q?: string;
  category?: string;
  department?: string;
  is_active?: string;
  limit?: string;
  cursor?: string;
};

type Cursor = { service_name: string; id: string };

type CreateBody = {
  service_code: string;
  service_name: string;
  base_price: string | number;
  tax_percentage?: string | number;
  description?: string | null;
  provider_id?: string | null;
  department_id?: string | null;
  department?: string | null;
  category?: string | null;
  sub_category?: string | null;
  tax_type?: string | null;
  is_active?: boolean;
  effective_from?: string;
  effective_to?: string | null;
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const MOCK_TS = "2026-05-15T00:00:00.000Z";

/** Paste this in Swagger POST /services body (or omit body in mock mode — defaults apply). */
export const CREATE_SERVICE_DUMMY: CreateBody = {
  service_code: "LAB_CBC",
  service_name: "CBC Test",
  base_price: "150.0000",
  tax_percentage: "0",
  description: "Complete blood count",
  category: "lab",
  tax_type: "CGST_SGST",
  department: "pathology",
  provider_id: null,
};

const createServiceSchema = {
  body: {
    type: "object",
    required: ["service_code", "service_name", "base_price"],
    properties: {
      service_code: { type: "string" },
      service_name: { type: "string" },
      base_price: { type: ["string", "number"] },
      tax_percentage: { type: ["string", "number"] },
      description: { type: ["string", "null"] },
      provider_id: { type: ["string", "null"], format: "uuid" },
      department_id: { type: ["string", "null"], format: "uuid" },
      department: { type: ["string", "null"] },
      category: { type: ["string", "null"] },
      sub_category: { type: ["string", "null"] },
      tax_type: { type: ["string", "null"] },
      is_active: { type: "boolean", default: true },
      effective_from: { type: "string", format: "date-time" },
      effective_to: { type: ["string", "null"], format: "date-time" },
    },
  },
} as const;

const MOCK_ROWS: TariffMasterRow[] = [
  {
    id: "11111111-1111-4111-8111-111111111101",
    iq_tenant_id: "00000000-0000-0000-0000-000000000007",
    service_code: "REG_FEE",
    service_name: "Registration Fee",
    description: "First visit registration",
    provider_id: null,
    department_id: null,
    consultation_type_id: null,
    department: "frontdesk",
    category: "registration",
    sub_category: null,
    tax_type: "EXEMPT",
    base_price: "100.0000",
    tax_percentage: "0.0000",
    is_active: true,
    effective_from: MOCK_TS,
    effective_to: null,
    created_at: MOCK_TS,
    updated_at: MOCK_TS,
    created_by: null,
    updated_by: null,
  },
  {
    id: "11111111-1111-4111-8111-111111111102",
    iq_tenant_id: "00000000-0000-0000-0000-000000000007",
    service_code: "CONS_GENERAL",
    service_name: "General Consultation (rack)",
    description: null,
    provider_id: null,
    department_id: null,
    consultation_type_id: null,
    department: "opd",
    category: "consultation",
    sub_category: null,
    tax_type: "CGST_SGST",
    base_price: "400.0000",
    tax_percentage: "0.0000",
    is_active: true,
    effective_from: MOCK_TS,
    effective_to: null,
    created_at: MOCK_TS,
    updated_at: MOCK_TS,
    created_by: null,
    updated_by: null,
  },
  {
    id: "11111111-1111-4111-8111-111111111103",
    iq_tenant_id: "00000000-0000-0000-0000-000000000007",
    service_code: "CONS_GENERAL",
    service_name: "General Consultation — Dr Smith",
    description: null,
    provider_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    department_id: null,
    consultation_type_id: null,
    department: "opd",
    category: "consultation",
    sub_category: null,
    tax_type: "CGST_SGST",
    base_price: "500.0000",
    tax_percentage: "0.0000",
    is_active: true,
    effective_from: MOCK_TS,
    effective_to: null,
    created_at: MOCK_TS,
    updated_at: MOCK_TS,
    created_by: null,
    updated_by: null,
  },
  {
    id: "11111111-1111-4111-8111-111111111104",
    iq_tenant_id: "00000000-0000-0000-0000-000000000007",
    service_code: "PROC_DRESSING",
    service_name: "Wound Dressing",
    description: null,
    provider_id: null,
    department_id: null,
    consultation_type_id: null,
    department: "opd",
    category: "procedure",
    sub_category: null,
    tax_type: "CGST_SGST",
    base_price: "200.0000",
    tax_percentage: "0.0000",
    is_active: true,
    effective_from: MOCK_TS,
    effective_to: null,
    created_at: MOCK_TS,
    updated_at: MOCK_TS,
    created_by: null,
    updated_by: null,
  },
];

function clampLimit(raw: string | undefined): number {
  const n = raw === undefined ? DEFAULT_LIMIT : Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return DEFAULT_LIMIT;
  return Math.min(Math.max(n, 1), MAX_LIMIT);
}

function parseBool(raw: string | undefined): boolean | undefined {
  if (raw === "true") return true;
  if (raw === "false") return false;
  return undefined;
}

function decodeCursor(raw: string | undefined): Cursor | null {
  if (!raw) return null;
  try {
    const c = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Cursor;
    return typeof c.service_name === "string" && typeof c.id === "string" ? c : null;
  } catch {
    return null;
  }
}

function encodeCursor(row: { service_name: string; id: string }): string {
  return Buffer.from(JSON.stringify(row)).toString("base64url");
}

function parseCreateBody(body: unknown): CreateBody | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.service_code !== "string" || typeof b.service_name !== "string") return null;
  if (
    b.base_price === undefined ||
    b.base_price === null ||
    (typeof b.base_price !== "string" && typeof b.base_price !== "number")
  ) {
    return null;
  }
  return {
    service_code: b.service_code,
    service_name: b.service_name,
    base_price: b.base_price as string | number,
    tax_percentage: b.tax_percentage as string | number | undefined,
    description: (b.description as string | null | undefined) ?? null,
    provider_id: (b.provider_id as string | null | undefined) ?? null,
    department_id: (b.department_id as string | null | undefined) ?? null,
    department: (b.department as string | null | undefined) ?? null,
    category: (b.category as string | null | undefined) ?? null,
    sub_category: (b.sub_category as string | null | undefined) ?? null,
    tax_type: (b.tax_type as string | null | undefined) ?? null,
    is_active: typeof b.is_active === "boolean" ? b.is_active : undefined,
    effective_from: typeof b.effective_from === "string" ? b.effective_from : undefined,
    effective_to:
      b.effective_to === null
        ? null
        : typeof b.effective_to === "string"
          ? b.effective_to
          : undefined,
  };
}

function sameProvider(a: string | null, b: string | null): boolean {
  return a === b || (a === null && b === null);
}

function hasDuplicate(tenantId: string, code: string, providerId: string | null): boolean {
  return MOCK_ROWS.some(
    (r) =>
      r.iq_tenant_id === tenantId &&
      r.service_code === code &&
      sameProvider(r.provider_id, providerId),
  );
}

function createMockRow(tenantId: string, body: CreateBody): TariffMasterRow {
  const now = new Date().toISOString();
  const effectiveFrom = body.effective_from ?? now;
  const providerId = body.provider_id ?? null;
  return {
    id: randomUUID(),
    iq_tenant_id: tenantId,
    service_code: body.service_code.trim(),
    service_name: body.service_name.trim(),
    description: body.description ?? null,
    provider_id: providerId,
    department_id: body.department_id ?? null,
    consultation_type_id: null,
    department: body.department ?? null,
    category: body.category ?? null,
    sub_category: body.sub_category ?? null,
    tax_type: body.tax_type ?? null,
    base_price: formatMoney(Number(body.base_price)),
    tax_percentage: formatMoney(Number(body.tax_percentage ?? 0)),
    is_active: body.is_active ?? true,
    effective_from: effectiveFrom,
    effective_to: body.effective_to ?? null,
    created_at: now,
    updated_at: now,
    created_by: null,
    updated_by: null,
  };
}

function listMock(tenantId: string, q: ListQuery, limit: number) {
  const cursor = decodeCursor(q.cursor);
  const active = parseBool(q.is_active);
  const term = q.q?.trim().toLowerCase();

  let rows = MOCK_ROWS.filter((r) => r.iq_tenant_id === tenantId);
  if (term) {
    rows = rows.filter(
      (r) =>
        r.service_name.toLowerCase().includes(term) ||
        r.service_code.toLowerCase().includes(term),
    );
  }
  const category = q.category?.trim();
  if (category) rows = rows.filter((r) => r.category === category);
  const department = q.department?.trim();
  if (department) rows = rows.filter((r) => r.department === department);
  if (active !== undefined) rows = rows.filter((r) => r.is_active === active);
  if (cursor) {
    rows = rows.filter(
      (r) =>
        r.service_name > cursor.service_name ||
        (r.service_name === cursor.service_name && r.id > cursor.id),
    );
  }

  rows.sort((a, b) =>
    a.service_name === b.service_name
      ? a.id.localeCompare(b.id)
      : a.service_name.localeCompare(b.service_name),
  );

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const last = pageRows.at(-1);

  return {
    data: pageRows,
    page: {
      limit,
      next_cursor:
        hasMore && last ? encodeCursor({ service_name: last.service_name, id: last.id }) : null,
    },
  };
}

async function billingRouter(
  app: FastifyInstance,
  { db, useMock, referenceValidator }: BillingRouterOptions,
): Promise<void> {
  const tariffRepo = createTariffMasterRepo(useMock || !db ? MOCK_ROWS : db);

  app.get<{ Querystring: ListQuery }>(
    "/services",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const q = request.query;
      const limit = clampLimit(q.limit);

      if (useMock) {
        return reply.send(listMock(request.tenantId, q, limit));
      }
      if (!db) {
        return reply.code(500).send({
          statusCode: 500,
          error: "Internal Server Error",
          message: "Database not configured (set BILLING_USE_MOCK_DATA=true for local mock data)",
        });
      }

      const cursor = decodeCursor(q.cursor);
      const conditions = [eq(billingMaster.iq_tenant_id, request.tenantId)];

      if (q.q?.trim()) {
        const term = `%${q.q.trim().replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
        conditions.push(
          sql`(${billingMaster.service_name} ILIKE ${term} OR ${billingMaster.service_code} ILIKE ${term})`,
        );
      }
      if (q.category?.trim()) conditions.push(eq(billingMaster.category, q.category.trim()));
      if (q.department?.trim()) conditions.push(eq(billingMaster.department, q.department.trim()));
      const active = parseBool(q.is_active);
      if (active !== undefined) conditions.push(eq(billingMaster.is_active, active));
      if (cursor) {
        conditions.push(
          sql`(${billingMaster.service_name}, ${billingMaster.id}) > (${cursor.service_name}, ${cursor.id}::uuid)`,
        );
      }

      const rows = await db
        .select()
        .from(billingMaster)
        .where(and(...conditions))
        .orderBy(billingMaster.service_name, billingMaster.id)
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const pageRows = hasMore ? rows.slice(0, limit) : rows;
      const last = pageRows.at(-1);

      return reply.send({
        data: pageRows.map(toTariffRow),
        page: {
          limit,
          next_cursor:
            hasMore && last
              ? encodeCursor({ service_name: last.service_name, id: last.id })
              : null,
        },
      });
    },
  );

  app.post<{ Body: CreateBody }>(
    "/services",
    {
      config: { authMode: "protected" },
      schema: createServiceSchema,
    },
    async (request, reply) => {
      const body = parseCreateBody(request.body) ?? (useMock ? CREATE_SERVICE_DUMMY : null);
      if (!body) {
        return reply.code(400).send({
          statusCode: 400,
          error: "Bad Request",
          message:
            "service_code, service_name, and base_price are required. Example body: " +
            JSON.stringify(CREATE_SERVICE_DUMMY),
        });
      }

      const tenantId = request.tenantId;

      if (useMock || !db) {
        if (hasDuplicate(tenantId, body.service_code.trim(), body.provider_id ?? null)) {
          return reply.code(409).send({
            statusCode: 409,
            error: "Conflict",
            message: "Service already exists for this tenant, code, and provider",
          });
        }
      } else if (!db) {
        return reply.code(500).send({
          statusCode: 500,
          error: "Internal Server Error",
          message: "Database not configured (set BILLING_USE_MOCK_DATA=true for local mock data)",
        });
      }

      return sendUseCaseResult(
        reply,
        await createTariffService(
          {
            tariffRepo,
            insert: async (tid, createBody, effective) => {
              if (useMock || !db) {
                const row = createMockRow(tid, createBody);
                MOCK_ROWS.push(row);
                return row;
              }
              const [row] = await db!
                .insert(billingMaster)
                .values(toInsertValues(tid, createBody, effective))
                .returning();
              if (!row) {
                throw new Error("Insert failed");
              }
              return toTariffRow(row);
            },
          },
          tenantId,
          body,
        ),
        201,
      );
    },
  );

  registerUpdateServiceHandler(app, tariffRepo);

  const consultationTypesRepo = createConsultationTypesRepo(useMock || !db ? "memory" : db!);
  const consultationRefs =
    referenceValidator ?? createPermissiveConsultationTariffReferenceValidator();
  registerProviderConsultationTariffHandlers(app, {
    tariffRepo,
    consultationTypesRepo,
    referenceValidator: consultationRefs,
  });

  const memoryBilling = useMock || !db ? createInMemoryBillingRepo() : null;
  if (memoryBilling && useMock) seedMockBills(memoryBilling.bills);
  const billingRepo = memoryBilling?.repo ?? createBillingRepo(db!);
  registerBillingHandlers(app, { tariffRepo, billingRepo });
}

export function createRouter(options: BillingRouterOptions) {
  return fp(async (app) => billingRouter(app, options), {
    fastify: "5.x",
    name: "@hims/billing",
  });
}
