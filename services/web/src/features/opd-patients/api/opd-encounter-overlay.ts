import { ApiError, apiClient } from '@/lib/api-client';
import type { OpdPrescriptionStatus } from '@/features/create-rx/api/opd-prescription-types';
import { resolveOpdConsultationTenantId } from '../lib/opd-consultation-tenant';

const OPD_PREFIX = '/api/v1/opd';
const PRESCRIPTIONS_PREFIX = `${OPD_PREFIX}/prescriptions`;

export interface OpdEncounterOverlay {
  prescriptionStatus: OpdPrescriptionStatus;
  visitStatus: string;
}

interface NormalizedPrescriptionByVisitResponse {
  data: {
    status: OpdPrescriptionStatus;
    visit_status?: string | null;
  };
}

function tenantQueryParam(tenantId: string): string {
  return `tenant_id=${encodeURIComponent(tenantId)}`;
}

async function fetchNormalizedPrescriptionByVisit(
  visitId: string,
  tenantId: string,
): Promise<NormalizedPrescriptionByVisitResponse['data'] | null> {
  const visitKey = visitId.trim();
  if (!visitKey) return null;
  try {
    const response = await apiClient<NormalizedPrescriptionByVisitResponse>(
      `${PRESCRIPTIONS_PREFIX}/by-visit/${encodeURIComponent(visitKey)}?${tenantQueryParam(tenantId)}`,
    );
    return response.data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
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

  const pairs = await Promise.all(
    unique.map(async (visitId) => {
      const row = await fetchNormalizedPrescriptionByVisit(visitId, tenantId);
      if (!row) return null;
      return [
        visitId,
        {
          prescriptionStatus: row.status,
          visitStatus: row.visit_status?.trim() || 'registered',
        },
      ] as const;
    }),
  );

  const map = new Map<string, OpdEncounterOverlay>();
  for (const pair of pairs) {
    if (pair) map.set(pair[0], pair[1]);
  }
  return map;
}
