import type { CareContextRepo, CareContextRow } from "../ports.js";
import type { CreateCareContextData } from "../domain/care-context.js";
import { isPostgresUniqueViolation } from "../data-access/postgres-errors.js";

interface Deps {
  careContextRepo: CareContextRepo;
}

export interface CreateCareContextResult {
  row: CareContextRow;
  /** false when an identical source-tuple context already existed (idempotent replay). */
  created: boolean;
}

/**
 * Idempotent on the dedup tuple behind uq_care_contexts_source. Clinical care
 * contexts arrive over an at-least-once event/HTTP path, so a redelivery of the
 * SAME source record must return the existing row, not error or duplicate.
 *
 * Strategy: insert optimistically; on a unique violation, re-fetch by the exact
 * dedup tuple and return it. This is race-safe and matches the DB constraint
 * precisely (no drift between a hand-written lookup and the index). A NULL
 * source_record_id never participates in the constraint, so such contexts are
 * always created fresh (manual contexts are not deduped).
 */
export async function createCareContext(
  deps: Deps,
  tenantId: string,
  data: CreateCareContextData,
): Promise<CreateCareContextResult> {
  // Normalize ONCE so the stored value and the dedup-refetch key are identical —
  // otherwise a whitespace-padded source_record_id is stored padded but re-fetched
  // trimmed, missing the row and surfacing a 500 instead of the idempotent 200.
  const sourceRecordId = data.source_record_id?.trim() || undefined;
  const normalized = { ...data, source_record_id: sourceRecordId };

  try {
    const row = await deps.careContextRepo.insert({ ...normalized, iqTenantId: tenantId });
    return { row, created: true };
  } catch (error) {
    if (isPostgresUniqueViolation(error) && sourceRecordId) {
      const existing = await deps.careContextRepo.findBySource(tenantId, {
        source_origin: normalized.source_origin,
        source_system_id: normalized.source_system_id,
        source_record_type: normalized.source_record_type,
        source_record_id: sourceRecordId,
      });
      if (existing) return { row: existing, created: false };
    }
    throw error;
  }
}
