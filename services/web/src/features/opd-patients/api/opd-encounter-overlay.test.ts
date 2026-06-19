import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/lib/api-client';
import { fetchOpdEncounterOverlaysByVisitIds } from './opd-encounter-overlay';

vi.mock('@/lib/api-client', () => ({
  apiClient: vi.fn(),
}));

vi.mock('../lib/opd-consultation-tenant', () => ({
  resolveOpdConsultationTenantId: vi.fn(() => 'tenant-1'),
}));

describe('fetchOpdEncounterOverlaysByVisitIds', () => {
  beforeEach(() => {
    vi.mocked(apiClient).mockReset();
  });

  it('fetches overlays in a single batch request', async () => {
    vi.mocked(apiClient).mockResolvedValue({
      data: {
        'visit-a': {
          status: 'draft',
          visit_status: 'pre_consulted',
          reports: {
            prescription: { available: false, reason: 'No prescription data available for this visit' },
            'op-consultation': { available: true },
            immunization: { available: false, reason: 'No immunization records available for this visit' },
          },
        },
        'visit-b': { status: 'final', visit_status: 'completed' },
      },
    });

    const result = await fetchOpdEncounterOverlaysByVisitIds([
      'visit-a',
      'visit-b',
      'visit-a',
    ]);

    expect(apiClient).toHaveBeenCalledTimes(1);
    expect(apiClient).toHaveBeenCalledWith(
      '/api/v1/opd/prescriptions/by-visits?tenant_id=tenant-1&visit_ids=visit-a%2Cvisit-b',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(result.get('visit-a')).toEqual({
      prescriptionStatus: 'draft',
      visitStatus: 'pre_consulted',
      reportAvailability: {
        prescription: { available: false, reason: 'No prescription data available for this visit' },
        'op-consultation': { available: true },
        immunization: { available: false, reason: 'No immunization records available for this visit' },
      },
    });
    expect(result.get('visit-b')).toEqual({
      prescriptionStatus: 'final',
      visitStatus: 'completed',
      reportAvailability: {
        'op-consultation': { available: true },
        prescription: { available: true },
        immunization: { available: true },
      },
    });
  });

  it('keeps backend unavailable reasons for non-final prescriptions', async () => {
    vi.mocked(apiClient).mockResolvedValue({
      data: {
        'visit-draft': {
          status: 'draft',
          visit_status: 'registered',
          reports: {
            prescription: { available: false, reason: 'Not finalized' },
          },
        },
      },
    });

    const result = await fetchOpdEncounterOverlaysByVisitIds(['visit-draft']);
    expect(result.get('visit-draft')?.reportAvailability).toEqual({
      'op-consultation': { available: false, reason: 'Reports are available only after consultation is completed' },
      prescription: { available: false, reason: 'Not finalized' },
      immunization: { available: false, reason: 'Reports are available only after consultation is completed' },
    });
  });

  it('returns an empty map when tenant id is unavailable', async () => {
    const { resolveOpdConsultationTenantId } = await import('../lib/opd-consultation-tenant');
    vi.mocked(resolveOpdConsultationTenantId).mockReturnValueOnce(null);

    const result = await fetchOpdEncounterOverlaysByVisitIds(['visit-a']);

    expect(apiClient).not.toHaveBeenCalled();
    expect(result.size).toBe(0);
  });
});
