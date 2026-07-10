import type { DbInstance } from "@hims/ts-sdk-db";
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
  /**
   * Schema that owns the `sequence_counters` table for this module
   * (e.g. "empi", "registration", "billing"). The counter is written there.
   */
  counterSchema: string;
  asOfDate?: Date;
  /**
   * Tenant sequence configuration resolved by the CALLER (service composition layer).
   * This package no longer reads configurator's schema — when omitted, platform defaults apply
   * (`normalizeTenantNumericCode(null)` = "00001", no custom overrides). Services fetch the real
   * config via `createHttpSequenceConfigLoader` at boot and pass it in.
   */
  identifierOverrides?: IdentifierOverrides | null;
  tenantNumericCode?: string;
}

/**
 * Increments the module-owned counter and returns the composed identifier.
 *
 * The compose + counter math is unchanged — only the config source (was a cross-schema SQL JOIN
 * into `configurator.*`) is now injected by the caller, and the counter lives in the caller's own
 * schema. Given the same injected config, the composed identifier is byte-identical to before.
 */
export async function allocateIdentifier(
  db: DbInstance,
  input: AllocateIdentifierInput,
): Promise<string> {
  const asOfDate = input.asOfDate ?? new Date();
  const tenantNumericCode = input.tenantNumericCode ?? normalizeTenantNumericCode(null);
  const identifierOverrides = input.identifierOverrides ?? {};

  const effective = resolveEffectiveIdentifier(input.identifierType, identifierOverrides);
  const counterKey = buildCounterKey(input.identifierType, effective.segments, asOfDate);
  const startsAt = sequenceStartsAt(effective.segments);
  const sequence = await nextSequenceValue(
    db,
    input.tenantId,
    counterKey,
    startsAt,
    input.counterSchema,
  );

  return composeIdentifier(effective.segments, tenantNumericCode, asOfDate, sequence);
}
