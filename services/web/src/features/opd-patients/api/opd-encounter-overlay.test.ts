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
        'visit-a': { status: 'draft', visit_status: 'pre_consulted' },
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
    );
    expect(result.get('visit-a')).toEqual({
      prescriptionStatus: 'draft',
      visitStatus: 'pre_consulted',
    });
    expect(result.get('visit-b')).toEqual({
      prescriptionStatus: 'final',
      visitStatus: 'completed',
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
