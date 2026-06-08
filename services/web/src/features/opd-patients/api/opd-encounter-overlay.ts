import { apiClient } from '@/lib/api-client';
import type { OpdPrescriptionStatus } from '@/features/create-rx/api/opd-prescription-types';
import { resolveOpdConsultationTenantId } from '../lib/opd-consultation-tenant';

const OPD_PREFIX = '/api/v1/opd';
const PRESCRIPTIONS_PREFIX = `${OPD_PREFIX}/prescriptions`;

export interface OpdEncounterOverlay {
  prescriptionStatus: OpdPrescriptionStatus;
  visitStatus: string;
}

interface PrescriptionEncounterOverlayDto {
  status: OpdPrescriptionStatus;
  visit_status: string;
}

interface PrescriptionEncounterOverlayBatchResponse {
  data: Record<string, PrescriptionEncounterOverlayDto>;
}

function tenantQueryParam(tenantId: string): string {
  return `tenant_id=${encodeURIComponent(tenantId)}`;
}

/**
 * OPD visit + prescription overlay per registration visit id (normalized REST API).
 * Nurse pre-consult sets ``visit_status`` to ``pre_consulted`` on ``opd.visits``.
 */
export async function fetchOpdEncounterOverlaysByVisitIds(
  visitIds: readonly string[],
): Promise<Map<string, OpdEncounterOverlay>> {
  const tenantId = resolveOpdConsultationTenantId();
  if (!tenantId) return new Map();

  const unique = [...new Set(visitIds.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) return new Map();

  const visitIdsParam = encodeURIComponent(unique.join(','));
  const response = await apiClient<PrescriptionEncounterOverlayBatchResponse>(
    `${PRESCRIPTIONS_PREFIX}/by-visits?${tenantQueryParam(tenantId)}&visit_ids=${visitIdsParam}`,
  );

  const map = new Map<string, OpdEncounterOverlay>();
  for (const [visitId, row] of Object.entries(response.data)) {
    map.set(visitId, {
      prescriptionStatus: row.status,
      visitStatus: row.visit_status?.trim() || 'registered',
    });
  }
  return map;
}
