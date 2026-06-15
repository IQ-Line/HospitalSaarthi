import { apiClient } from '@/lib/api-client';
import type { OpdPrescriptionStatus } from '@/features/create-rx/api/opd-prescription-types';
import { resolveOpdConsultationTenantId } from '../lib/opd-consultation-tenant';

const OPD_PREFIX = '/api/v1/opd';
const PRESCRIPTIONS_PREFIX = `${OPD_PREFIX}/prescriptions`;

export type ClinicalReportType = 'op-consultation' | 'prescription' | 'immunization';

export interface ClinicalReportAvailabilityItem {
  available: boolean;
  reason?: string;
}

export type ClinicalReportAvailability = Record<
  ClinicalReportType,
  ClinicalReportAvailabilityItem
>;

export interface OpdEncounterOverlay {
  prescriptionStatus: OpdPrescriptionStatus;
  visitStatus: string;
  reportAvailability?: ClinicalReportAvailability;
}

interface ClinicalReportAvailabilityDto {
  available: boolean;
  reason?: string | null;
}

interface PrescriptionEncounterOverlayDto {
  status: OpdPrescriptionStatus;
  visit_status: string;
  reports?: Partial<Record<string, ClinicalReportAvailabilityDto>> | null;
}

interface PrescriptionEncounterOverlayBatchResponse {
  data: Record<string, PrescriptionEncounterOverlayDto>;
}

const REPORT_TYPES: ClinicalReportType[] = [
  'op-consultation',
  'prescription',
  'immunization',
];

function tenantQueryParam(tenantId: string): string {
  return `tenant_id=${encodeURIComponent(tenantId)}`;
}

function mapReportAvailability(
  reports?: Partial<Record<string, ClinicalReportAvailabilityDto>> | null,
): ClinicalReportAvailability | undefined {
  if (!reports) return undefined;

  const mapped = {} as ClinicalReportAvailability;
  for (const reportType of REPORT_TYPES) {
    const item = reports[reportType];
    if (!item) continue;
    mapped[reportType] = {
      available: item.available,
      ...(item.reason?.trim() ? { reason: item.reason.trim() } : {}),
    };
  }
  return Object.keys(mapped).length > 0 ? mapped : undefined;
}

function defaultAvailableClinicalReportAvailability(): ClinicalReportAvailability {
  return Object.fromEntries(
    REPORT_TYPES.map((reportType) => [reportType, { available: true }]),
  ) as ClinicalReportAvailability;
}

/** Merge API availability with sensible defaults for finalized consultations. */
export function resolveClinicalReportAvailability(
  prescriptionStatus: OpdPrescriptionStatus | undefined,
  partial?: ClinicalReportAvailability,
): ClinicalReportAvailability {
  const mergePartial = (
    base: ClinicalReportAvailability,
  ): ClinicalReportAvailability =>
    REPORT_TYPES.reduce((acc, reportType) => {
      acc[reportType] = partial?.[reportType] ?? base[reportType]!;
      return acc;
    }, {} as ClinicalReportAvailability);

  if (prescriptionStatus === 'final') {
    return mergePartial(defaultAvailableClinicalReportAvailability());
  }

  if (partial) {
    return mergePartial(
      unavailableClinicalReportAvailability(
        'Reports are available only after consultation is completed',
      ),
    );
  }

  return unavailableClinicalReportAvailability(
    prescriptionStatus === 'cancelled'
      ? 'Prescription was cancelled'
      : prescriptionStatus
        ? 'Reports are available only after consultation is completed'
        : 'Prescription not found for this visit',
  );
}

function normalizeVisitId(visitId: string): string {
  return visitId.trim().toLowerCase();
}

export function resolveVisitClinicalReportAvailability(
  visitId: string,
  overlays?: Record<string, OpdEncounterOverlay>,
): ClinicalReportAvailability {
  const overlay =
    overlays?.[visitId] ??
    overlays?.[normalizeVisitId(visitId)];
  if (!overlay) {
    return unavailableClinicalReportAvailability();
  }
  return resolveClinicalReportAvailability(
    overlay.prescriptionStatus,
    overlay.reportAvailability,
  );
}

export function getEncounterOverlayByVisitId(
  overlays: ReadonlyMap<string, OpdEncounterOverlay>,
  visitId: string,
): OpdEncounterOverlay | undefined {
  return overlays.get(normalizeVisitId(visitId));
}

export function unavailableClinicalReportAvailability(
  reason = 'Prescription not found for this visit',
): ClinicalReportAvailability {
  return Object.fromEntries(
    REPORT_TYPES.map((reportType) => [reportType, { available: false, reason }]),
  ) as ClinicalReportAvailability;
}

export function encounterOverlaysToRecord(
  overlays: ReadonlyMap<string, OpdEncounterOverlay>,
): Record<string, OpdEncounterOverlay> {
  return Object.fromEntries(overlays);
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
    const partial = mapReportAvailability(row.reports);
    map.set(normalizeVisitId(visitId), {
      prescriptionStatus: row.status,
      visitStatus: row.visit_status?.trim() || 'registered',
      reportAvailability: resolveClinicalReportAvailability(row.status, partial),
    });
  }
  return map;
}
