/** Helpers for POST /services — single row or doctor multi-department bulk create. */

type OptionalPriceLike = string | number | undefined;

export type DepartmentTariffItem = {
  department_id: string;
  base_price: string | number;
  tax_percentage?: string | number;
  service_code?: string;
  service_name?: string;
};

export type CreateServiceBody = {
  service_code?: string;
  service_name?: string;
  base_price?: string | number;
  tax_percentage?: string | number;
  description?: string | null;
  provider_id?: string | null;
  department_id?: string | null;
  category?: string | null;
  sub_category?: string | null;
  tax_type?: string | null;
  is_active?: boolean;
  effective_from?: string;
  effective_to?: string | null;
  /** When set with `provider_id`, creates one tariff row per department (doctor consultation). */
  department_tariffs?: DepartmentTariffItem[];
};

export function buildDepartmentServiceCode(departmentId: string): string {
  const seg = departmentId.replace(/-/g, "").slice(0, 16).toUpperCase();
  return `CONSULT_${seg}`.slice(0, 64);
}

export function isBulkDoctorCreate(body: CreateServiceBody): body is CreateServiceBody & {
  provider_id: string;
  department_tariffs: DepartmentTariffItem[];
} {
  return (
    typeof body.provider_id === "string" &&
    body.provider_id.trim().length > 0 &&
    Array.isArray(body.department_tariffs) &&
    body.department_tariffs.length > 0
  );
}

/** True when v is a non-empty price literal (string|number, not null/undefined). */
function isPriceLike(v: unknown): v is string | number {
  return v !== undefined && v !== null && (typeof v === "string" || typeof v === "number");
}

/** Normalize a nullable string field: keep strings, coerce null/undefined/non-string to null. */
function asNullableString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

/** Parse one raw department_tariffs entry; returns null when it fails minimum shape. */
function parseDepartmentTariffItem(raw: unknown): DepartmentTariffItem | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  if (typeof item.department_id !== "string") return null;
  if (!isPriceLike(item.base_price)) return null;
  return {
    department_id: item.department_id,
    base_price: item.base_price,
    tax_percentage: item.tax_percentage as OptionalPriceLike,
    service_code: typeof item.service_code === "string" ? item.service_code : undefined,
    service_name: typeof item.service_name === "string" ? item.service_name : undefined,
  } satisfies DepartmentTariffItem;
}

/** Parse the optional department_tariffs array; undefined when the field isn't an array. */
function parseDepartmentTariffs(value: unknown): DepartmentTariffItem[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .map(parseDepartmentTariffItem)
    .filter((x): x is DepartmentTariffItem => x !== null);
}

export function parseCreateServiceBody(body: unknown): CreateServiceBody | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  const parsed: CreateServiceBody = {
    service_code: typeof b.service_code === "string" ? b.service_code : undefined,
    service_name: typeof b.service_name === "string" ? b.service_name : undefined,
    base_price: b.base_price as OptionalPriceLike,
    tax_percentage: b.tax_percentage as OptionalPriceLike,
    description: (b.description as string | null | undefined) ?? null,
    provider_id: asNullableString(b.provider_id),
    department_id: asNullableString(b.department_id),
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
    department_tariffs: parseDepartmentTariffs(b.department_tariffs),
  };

  if (isBulkDoctorCreate(parsed)) return parsed;

  if (typeof parsed.service_code !== "string" || typeof parsed.service_name !== "string") {
    return null;
  }
  if (!isPriceLike(parsed.base_price)) return null;
  return parsed;
}

export function validateSingleCreate(body: CreateServiceBody): string | null {
  if (!body.service_code?.trim()) return "service_code is required";
  if (!body.service_name?.trim()) return "service_name is required";
  const price = Number(body.base_price);
  if (!Number.isFinite(price) || price < 0) return "base_price must be >= 0";
  const tax = Number(body.tax_percentage ?? 0);
  if (!Number.isFinite(tax) || tax < 0 || tax > 100) return "tax_percentage must be between 0 and 100";
  return null;
}

export function validateBulkCreate(
  body: CreateServiceBody & { department_tariffs: DepartmentTariffItem[] },
): string | null {
  if (!body.provider_id?.trim()) return "provider_id is required for department_tariffs";
  const seen = new Set<string>();
  for (const [i, item] of body.department_tariffs.entries()) {
    if (!item.department_id?.trim()) return `department_tariffs[${i}].department_id is required`;
    if (seen.has(item.department_id)) return "Each department_id may appear only once";
    seen.add(item.department_id);
    const price = Number(item.base_price);
    if (!Number.isFinite(price) || price < 0) return `department_tariffs[${i}].base_price must be >= 0`;
    const tax = Number(item.tax_percentage ?? body.tax_percentage ?? 0);
    if (!Number.isFinite(tax) || tax < 0 || tax > 100) {
      return `department_tariffs[${i}].tax_percentage must be between 0 and 100`;
    }
  }
  return null;
}

export function expandBulkCreateRows(
  tenantId: string,
  body: CreateServiceBody & { provider_id: string; department_tariffs: DepartmentTariffItem[] },
  defaults: { effectiveFrom: Date; effectiveTo: Date | null },
): Array<{
  iq_tenant_id: string;
  service_code: string;
  service_name: string;
  description: string | null;
  provider_id: string;
  department_id: string;
  category: string | null;
  sub_category: string | null;
  tax_type: string | null;
  is_active: boolean;
  base_price: string;
  tax_percentage: string;
  effective_from: Date;
  effective_to: Date | null;
}> {
  const prefix = body.service_name?.trim() || "Consultation";
  const category = body.category ?? "consultation-fee";
  const isActive = body.is_active ?? true;

  return body.department_tariffs.map((item) => ({
    iq_tenant_id: tenantId,
    service_code: (item.service_code?.trim() || buildDepartmentServiceCode(item.department_id)).slice(
      0,
      64,
    ),
    service_name: (item.service_name?.trim() || `${prefix} — ${item.department_id}`).slice(0, 512),
    description: body.description ?? null,
    provider_id: body.provider_id,
    department_id: item.department_id,
    category,
    sub_category: body.sub_category ?? null,
    tax_type: body.tax_type ?? null,
    is_active: isActive,
    base_price: Number(item.base_price).toFixed(4),
    tax_percentage: Number(item.tax_percentage ?? body.tax_percentage ?? 0).toFixed(4),
    effective_from: defaults.effectiveFrom,
    effective_to: defaults.effectiveTo,
  }));
}

/** Stagger created_at by 1ms per row so bulk inserts keep submission order in DB lists. */
export function stampTariffInsertTimestamps<T extends Record<string, unknown>>(
  rows: T[],
  base = new Date(),
): Array<T & { created_at: Date; updated_at: Date }> {
  const t0 = base.getTime();
  return rows.map((row, i) => {
    const at = new Date(t0 + i);
    return { ...row, created_at: at, updated_at: at };
  });
}
