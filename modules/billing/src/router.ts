import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { and, desc, eq, sql, type DbInstance } from "@hims/ts-sdk-db";
import { createTariffMasterRepo } from "./data-access/tariff-master.repository.js";
import type { TariffMasterRow } from "./domain/tariff-master.types.js";
import { formatMoney, parseEffectiveWindow, toTariffRow } from "./lib/tariff-api.js";
import {
  expandBulkCreateRows,
  isBulkDoctorCreate,
  parseCreateServiceBody,
  stampTariffInsertTimestamps,
  type CreateServiceBody,
  validateBulkCreate,
  validateSingleCreate,
} from "./lib/create-tariff-service.js";
import { createBillingRepo, createInMemoryBillingRepo } from "./data-access/billing.repository.js";
import { seedMockBills } from "./lib/mock-bills.js";
import { registerBillingHandlers } from "./rest-handlers/billing.handlers.js";
import { registerUpdateServiceHandler } from "./rest-handlers/update-service.handler.js";
import { billingMaster } from "./schema/tables.js";

export interface BillingRouterOptions {
  db?: DbInstance;
  /** Return in-memory sample rows (no DB). Default off; set BILLING_USE_MOCK_DATA=true in billing-svc. */
  useMock?: boolean;
}

type ListQuery = {
  q?: string;
  category?: string;
  /** Filters `department_id` (uuid). Alias: `department_id`. */
  department?: string;
  department_id?: string;
  /** Doctor / provider uuid — consultation tariffs for a user. */
  provider_id?: string;
  /** Alias for `provider_id` — filter consultation tariffs by doctor user id. */
  doctor_id?: string;
  is_active?: string;
  limit?: string;
  cursor?: string;
};

function isBillingSchemaDriftError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /department_id|billing\.["']?tariff_master|relation .* does not exist|Failed query/i.test(
    msg,
  );
}

type Cursor = { created_at: string; id: string };

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const MOCK_TS = "2026-05-15T00:00:00.000Z";

/** Paste this in Swagger POST /services body (or omit body in mock mode — defaults apply). */
export const CREATE_SERVICE_DUMMY: CreateServiceBody = {
  service_code: "LAB_CBC",
  service_name: "CBC Test",
  base_price: "150.0000",
  tax_percentage: "0",
  description: "Complete blood count",
  category: "lab",
  tax_type: "CGST_SGST",
  department_id: null,
  provider_id: null,
};

const createServiceSchema = {
  body: {
    type: "object",
    properties: {
      service_code: { type: "string" },
      service_name: { type: "string" },
      base_price: { type: ["string", "number"] },
      tax_percentage: { type: ["string", "number"] },
      description: { type: ["string", "null"] },
      provider_id: { type: ["string", "null"], format: "uuid" },
      department_id: { type: ["string", "null"], format: "uuid" },
      category: { type: ["string", "null"] },
      sub_category: { type: ["string", "null"] },
      tax_type: { type: ["string", "null"] },
      is_active: { type: "boolean", default: true },
      effective_from: { type: "string", format: "date-time" },
      effective_to: { type: ["string", "null"], format: "date-time" },
      department_tariffs: {
        type: "array",
        items: {
          type: "object",
          required: ["department_id", "base_price"],
          properties: {
            department_id: { type: "string", format: "uuid" },
            base_price: { type: ["string", "number"] },
            tax_percentage: { type: ["string", "number"] },
            service_code: { type: "string" },
            service_name: { type: "string" },
          },
        },
      },
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
    return typeof c.created_at === "string" && typeof c.id === "string" ? c : null;
  } catch {
    return null;
  }
}

function encodeCursor(row: { created_at: string; id: string }): string {
  return Buffer.from(JSON.stringify(row)).toString("base64url");
}

function compareCreatedDesc(a: TariffMasterRow, b: TariffMasterRow): number {
  const byCreated = b.created_at.localeCompare(a.created_at);
  return byCreated !== 0 ? byCreated : b.id.localeCompare(a.id);
}

function isBeforeCursor(row: TariffMasterRow, cursor: Cursor): boolean {
  return (
    row.created_at < cursor.created_at ||
    (row.created_at === cursor.created_at && row.id < cursor.id)
  );
}

function sameProvider(a: string | null, b: string | null): boolean {
  return a === b || (a === null && b === null);
}

function hasDuplicate(
  tenantId: string,
  code: string,
  providerId: string | null,
  departmentId: string | null,
): boolean {
  return (
    MOCK_ROWS.some(
      (r) =>
        r.iq_tenant_id === tenantId &&
        r.service_code === code &&
        sameProvider(r.provider_id, providerId),
    ) ||
    (providerId !== null &&
      departmentId !== null &&
      MOCK_ROWS.some(
        (r) =>
          r.iq_tenant_id === tenantId &&
          r.provider_id === providerId &&
          r.department_id === departmentId,
      ))
  );
}

function listDepartmentFilter(q: ListQuery): string | undefined {
  return q.department_id?.trim() || q.department?.trim() || undefined;
}

function listProviderFilter(q: ListQuery): string | undefined {
  return q.provider_id?.trim() || q.doctor_id?.trim() || undefined;
}

function createMockRow(tenantId: string, body: CreateServiceBody & { service_code: string; service_name: string; base_price: string | number }): TariffMasterRow {
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
  const departmentId = listDepartmentFilter(q);
  if (departmentId) rows = rows.filter((r) => r.department_id === departmentId);
  const providerId = listProviderFilter(q);
  if (providerId) rows = rows.filter((r) => r.provider_id === providerId);
  if (active !== undefined) rows = rows.filter((r) => r.is_active === active);
  if (cursor) {
    rows = rows.filter((r) => isBeforeCursor(r, cursor));
  }

  rows.sort(compareCreatedDesc);

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const last = pageRows.at(-1);

  return {
    data: pageRows,
    page: {
      limit,
      next_cursor:
        hasMore && last ? encodeCursor({ created_at: last.created_at, id: last.id }) : null,
    },
  };
}

async function billingRouter(
  app: FastifyInstance,
  { db, useMock }: BillingRouterOptions,
): Promise<void> {
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
      const departmentId = listDepartmentFilter(q);
      if (departmentId) conditions.push(eq(billingMaster.department_id, departmentId));
      const providerId = listProviderFilter(q);
      if (providerId) conditions.push(eq(billingMaster.provider_id, providerId));
      const active = parseBool(q.is_active);
      if (active !== undefined) conditions.push(eq(billingMaster.is_active, active));
      if (cursor) {
        conditions.push(
          sql`(${billingMaster.created_at}, ${billingMaster.id}) < (${cursor.created_at}::timestamptz, ${cursor.id}::uuid)`,
        );
      }

      let rows: (typeof billingMaster.$inferSelect)[];
      try {
        rows = await db
          .select()
          .from(billingMaster)
          .where(and(...conditions))
          .orderBy(desc(billingMaster.created_at), desc(billingMaster.id))
          .limit(limit + 1);
      } catch (err) {
        if (isBillingSchemaDriftError(err)) {
          return reply.code(503).send({
            statusCode: 503,
            error: "Service Unavailable",
            message:
              "Billing schema is out of date. Run: npx nx run billing:db-migrate (or make db-migrate)",
          });
        }
        throw err;
      }

      const hasMore = rows.length > limit;
      const pageRows = hasMore ? rows.slice(0, limit) : rows;
      const last = pageRows.at(-1);

      return reply.send({
        data: pageRows.map(toTariffRow),
        page: {
          limit,
          next_cursor:
            hasMore && last
              ? encodeCursor({ created_at: last.created_at.toISOString(), id: last.id })
              : null,
        },
      });
    },
  );

  app.post<{ Body: CreateServiceBody }>(
    "/services",
    {
      config: { authMode: "protected" },
      schema: createServiceSchema,
    },
    async (request, reply) => {
      const parsed =
        parseCreateServiceBody(request.body) ??
        (useMock && !isBulkDoctorCreate(request.body as CreateServiceBody)
          ? (CREATE_SERVICE_DUMMY as CreateServiceBody & {
              service_code: string;
              service_name: string;
              base_price: string | number;
            })
          : null);

      if (!parsed) {
        return reply.code(400).send({
          statusCode: 400,
          error: "Bad Request",
          message:
            "Provide service_code, service_name, and base_price — or provider_id with department_tariffs[]. Example: " +
            JSON.stringify(CREATE_SERVICE_DUMMY),
        });
      }

      const tenantId = request.tenantId;

      if (isBulkDoctorCreate(parsed)) {
        const bulkError = validateBulkCreate(parsed);
        if (bulkError) {
          return reply.code(400).send({ statusCode: 400, error: "Bad Request", message: bulkError });
        }

        const effective = parseEffectiveWindow(parsed.effective_from, parsed.effective_to);
        if (typeof effective === "string") {
          return reply.code(400).send({ statusCode: 400, error: "Bad Request", message: effective });
        }

        const rowsToInsert = expandBulkCreateRows(tenantId, parsed, {
          effectiveFrom: effective.from,
          effectiveTo: effective.to,
        });

        if (useMock) {
          for (const row of rowsToInsert) {
            if (hasDuplicate(tenantId, row.service_code, row.provider_id, row.department_id)) {
              return reply.code(409).send({
                statusCode: 409,
                error: "Conflict",
                message: "Consultation tariff already exists for this doctor and department",
              });
            }
          }
          const base = Date.now();
          const created = rowsToInsert.map((row, i) => {
            const r = createMockRow(tenantId, {
              ...parsed,
              service_code: row.service_code,
              service_name: row.service_name,
              base_price: row.base_price,
              department_id: row.department_id,
              provider_id: row.provider_id,
            });
            const ts = new Date(base + i).toISOString();
            r.created_at = ts;
            r.updated_at = ts;
            return r;
          });
          MOCK_ROWS.push(...created);
          return reply.code(201).send({ data: created });
        }

        if (!db) {
          return reply.code(500).send({
            statusCode: 500,
            error: "Internal Server Error",
            message: "Database not configured (set BILLING_USE_MOCK_DATA=true for local mock data)",
          });
        }

        try {
          const inserted = await db
            .insert(billingMaster)
            .values(stampTariffInsertTimestamps(rowsToInsert))
            .returning();
          return reply.code(201).send({ data: inserted.map(toTariffRow) });
        } catch (err: unknown) {
          if ((err as { code?: string }).code === "23505") {
            return reply.code(409).send({
              statusCode: 409,
              error: "Conflict",
              message: "Consultation tariff already exists for this doctor and department",
            });
          }
          throw err;
        }
      }

      const validationError = validateSingleCreate(parsed);
      if (validationError) {
        return reply.code(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: validationError,
        });
      }

      const providerId = parsed.provider_id ?? null;
      const code = parsed.service_code!.trim();
      const departmentId = parsed.department_id ?? null;

      if (useMock) {
        if (hasDuplicate(tenantId, code, providerId, departmentId)) {
          return reply.code(409).send({
            statusCode: 409,
            error: "Conflict",
            message:
              providerId && departmentId
                ? "Consultation tariff already exists for this doctor and department"
                : "Service already exists for this tenant, code, and provider",
          });
        }
        const row = createMockRow(tenantId, parsed as CreateServiceBody & { service_code: string; service_name: string; base_price: string | number });
        MOCK_ROWS.push(row);
        return reply.code(201).send({ data: row });
      }

      if (!db) {
        return reply.code(500).send({
          statusCode: 500,
          error: "Internal Server Error",
          message: "Database not configured (set BILLING_USE_MOCK_DATA=true for local mock data)",
        });
      }

      const effective = parseEffectiveWindow(parsed.effective_from, parsed.effective_to);
      if (typeof effective === "string") {
        return reply.code(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: effective,
        });
      }

      try {
        const now = new Date();
        const [row] = await db
          .insert(billingMaster)
          .values({
            iq_tenant_id: tenantId,
            service_code: code,
            service_name: parsed.service_name!.trim(),
            description: parsed.description ?? null,
            provider_id: providerId,
            department_id: departmentId,
            category: parsed.category ?? null,
            sub_category: parsed.sub_category ?? null,
            tax_type: parsed.tax_type ?? null,
            is_active: parsed.is_active ?? true,
            base_price: formatMoney(Number(parsed.base_price)),
            tax_percentage: formatMoney(Number(parsed.tax_percentage ?? 0)),
            effective_from: effective.from,
            effective_to: effective.to,
            created_at: now,
            updated_at: now,
          })
          .returning();

        if (!row) {
          return reply.code(500).send({
            statusCode: 500,
            error: "Internal Server Error",
            message: "Insert failed",
          });
        }
        return reply.code(201).send({ data: toTariffRow(row) });
      } catch (err: unknown) {
        if ((err as { code?: string }).code === "23505") {
          return reply.code(409).send({
            statusCode: 409,
            error: "Conflict",
            message:
              providerId && departmentId
                ? "Consultation tariff already exists for this doctor and department"
                : "Service already exists for this tenant, code, and provider",
          });
        }
        throw err;
      }
    },
  );

  const tariffRepo = createTariffMasterRepo(useMock || !db ? MOCK_ROWS : db);
  registerUpdateServiceHandler(app, tariffRepo);

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
