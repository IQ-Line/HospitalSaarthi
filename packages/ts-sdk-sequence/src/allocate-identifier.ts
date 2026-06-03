import type { DbInstance } from "@hims/ts-sdk-db";
import { sql } from "@hims/ts-sdk-db";
import {
  buildCounterKey,
  composeIdentifier,
  normalizeTenantNumericCode,
  resolveEffectiveIdentifier,
  sequenceStartsAt,
} from "./compose.js";
import { nextSequenceValue } from "./counter.js";
import type { IdentifierOverrides, IdentifierType } from "./types.js";

export interface AllocateIdentifierInput {
  tenantId: string;
  identifierType: IdentifierType;
  asOfDate?: Date;
  /** When provided, skips DB read of sequence_configuration (tests / cached config). */
  identifierOverrides?: IdentifierOverrides | null;
  tenantNumericCode?: string;
}

interface SequenceConfigRow {
  tenant_numeric_code: unknown;
  identifier_overrides: unknown;
}

async function loadTenantSequenceConfig(
  db: DbInstance,
  tenantId: string,
): Promise<{ tenantNumericCode: string; identifierOverrides: IdentifierOverrides }> {
  const result = await db.execute(sql`
    SELECT t.tenant_numeric_code, sc.identifier_overrides
    FROM configurator.tenants t
    LEFT JOIN configurator.sequence_configuration sc
      ON sc.iq_tenant_id = t.iq_tenant_id
    WHERE t.iq_tenant_id = ${tenantId}
    LIMIT 1
  `);

  const rows = (result as unknown as { rows: SequenceConfigRow[] }).rows ?? [];
  const row = rows[0];
  if (!row) {
    return { tenantNumericCode: normalizeTenantNumericCode(null), identifierOverrides: {} };
  }

  return {
    tenantNumericCode: normalizeTenantNumericCode(
      row.tenant_numeric_code == null ? null : String(row.tenant_numeric_code),
    ),
    identifierOverrides: (row.identifier_overrides ?? {}) as IdentifierOverrides,
  };
}

/**
 * Reads tenant sequence configuration, increments the counter, and returns the composed identifier.
 */
export async function allocateIdentifier(
  db: DbInstance,
  input: AllocateIdentifierInput,
): Promise<string> {
  const asOfDate = input.asOfDate ?? new Date();

  let tenantNumericCode = input.tenantNumericCode;
  let identifierOverrides = input.identifierOverrides;

  if (tenantNumericCode == null || identifierOverrides === undefined) {
    const loaded = await loadTenantSequenceConfig(db, input.tenantId);
    tenantNumericCode ??= loaded.tenantNumericCode;
    identifierOverrides ??= loaded.identifierOverrides;
  }

  const effective = resolveEffectiveIdentifier(input.identifierType, identifierOverrides);
  const counterKey = buildCounterKey(input.identifierType, effective.segments, asOfDate);
  const startsAt = sequenceStartsAt(effective.segments);
  const sequence = await nextSequenceValue(db, input.tenantId, counterKey, startsAt);

  return composeIdentifier(effective.segments, tenantNumericCode, asOfDate, sequence);
}
