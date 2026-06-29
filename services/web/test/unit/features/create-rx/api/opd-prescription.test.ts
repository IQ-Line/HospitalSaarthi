import { beforeEach, describe, expect, it, vi } from 'vitest';

// Minimal api-client mock: a stubbed `apiClient` plus a real `ApiError` class so the
// module-under-test's `instanceof ApiError` 404 handling resolves to the same class.
vi.mock('@/lib/api-client', () => {
  class ApiError extends Error {
    constructor(
      public readonly status: number,
      public readonly body: string,
    ) {
      super(`API error ${status}: ${body}`);
      this.name = 'ApiError';
    }
  }
  return { apiClient: vi.fn(), ApiError };
});

vi.mock('@/features/frontdesk/api/registrations', () => ({
  updateRegistrationVisitStatus: vi.fn(async () => undefined),
}));

vi.mock('@/features/opd-patients/lib/opd-consultation-tenant', () => ({
  resolveOpdConsultationTenantId: () => 'tenant-1',
}));

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: { getState: () => ({ userId: 'doctor-1', accessToken: null }) },
}));

import { apiClient, ApiError } from '@/lib/api-client';
import { updateRegistrationVisitStatus } from '@/features/frontdesk/api/registrations';
import type { OpdPrescriptionDetail } from '../../../../../src/features/create-rx/api/opd-prescription-types';
import {
  endConsultation,
  fetchPrescriptionByVisitId,
  saveOpdPrescriptionDraft,
} from '../../../../../src/features/create-rx/api/opd-prescription';
import { emptyDraftFormData } from '../../../../../src/features/create-rx/lib/opd-prescription-mapper';

const apiClientMock = vi.mocked(apiClient);
const updateVisitStatusMock = vi.mocked(updateRegistrationVisitStatus);

const PRESCRIPTIONS = '/api/v1/opd/prescriptions';

function makeDetail(overrides: Partial<OpdPrescriptionDetail> = {}): OpdPrescriptionDetail {
  return {
    id: 'rx-1',
    tenant_id: 'tenant-1',
    visit_id: 'visit-1',
    patient_id: 'patient-1',
    doctor_id: 'doctor-1',
    vitals_schema_version: 1,
    status: 'draft',
    finalized_at: null,
    cancelled_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    clinical: {},
    ...overrides,
  };
}

interface RecordedCall {
  method: string;
  url: string;
}

function pathOnly(path: string): string {
  return path.split('?')[0] ?? path;
}

function recordedCalls(): RecordedCall[] {
  return apiClientMock.mock.calls.map(([path, options]) => ({
    method: ((options as RequestInit | undefined)?.method ?? 'GET').toUpperCase(),
    url: pathOnly(path as string),
  }));
}

/** Parsed JSON body of the first call matching method + exact url. */
function bodyOf(method: string, url: string): Record<string, unknown> | undefined {
  const call = apiClientMock.mock.calls.find(([path, options]) => {
    const m = ((options as RequestInit | undefined)?.method ?? 'GET').toUpperCase();
    return m === method && pathOnly(path as string) === url;
  });
  const raw = (call?.[1] as RequestInit | undefined)?.body;
  return typeof raw === 'string' ? (JSON.parse(raw) as Record<string, unknown>) : undefined;
}

/**
 * Default normalized backend: no draft exists for a visit (by-visit 404), create returns
 * `rx-created`, update echoes a draft, finalize echoes a final. Individual tests override
 * the by-visit response when they need an existing draft.
 */
function installNormalizedBackend(): void {
  apiClientMock.mockImplementation((async (path: string, options?: RequestInit) => {
    const method = (options?.method ?? 'GET').toUpperCase();
    const url = pathOnly(path);
    if (method === 'GET' && url.includes('/prescriptions/by-visit/')) {
      throw new ApiError(404, 'no draft for visit');
    }
    if (method === 'POST' && url.endsWith('/finalize')) {
      return { data: makeDetail({ id: 'rx-final', status: 'final' }) };
    }
    if (method === 'POST' && url.endsWith('/prescriptions')) {
      return { data: makeDetail({ id: 'rx-created', status: 'draft' }) };
    }
    if (method === 'PUT' && url.includes('/prescriptions/')) {
      return { data: makeDetail({ id: 'rx-updated', status: 'draft' }) };
    }
    throw new Error(`unexpected apiClient call: ${method} ${url}`);
  }) as typeof apiClient);
}

beforeEach(() => {
  vi.clearAllMocks();
  installNormalizedBackend();
});

describe('fetchPrescriptionByVisitId (normalized by-visit)', () => {
  it('reads the normalized by-visit endpoint and maps the detail to a session', async () => {
    apiClientMock.mockResolvedValueOnce({
      data: makeDetail({ id: 'rx-9', visit_id: 'v-9', patient_id: 'p-9' }),
    } as never);

    const session = await fetchPrescriptionByVisitId('v-9');

    expect(session?.prescription_id).toBe('rx-9');
    expect(session?.visit_id).toBe('v-9');
    expect(recordedCalls()).toEqual([{ method: 'GET', url: `${PRESCRIPTIONS}/by-visit/v-9` }]);
  });

  it('returns null when no prescription exists for the visit (404)', async () => {
    expect(await fetchPrescriptionByVisitId('v-missing')).toBeNull();
    expect(recordedCalls()).toEqual([
      { method: 'GET', url: `${PRESCRIPTIONS}/by-visit/v-missing` },
    ]);
  });
});

describe('saveOpdPrescriptionDraft (normalized)', () => {
  it('creates then updates a draft when no prescription id is known', async () => {
    const session = await saveOpdPrescriptionDraft(
      'visit-1',
      'patient-1',
      emptyDraftFormData(),
      null,
    );

    expect(session.prescription_id).toBe('rx-updated');
    expect(recordedCalls()).toEqual([
      { method: 'GET', url: `${PRESCRIPTIONS}/by-visit/visit-1` },
      { method: 'POST', url: PRESCRIPTIONS },
      { method: 'PUT', url: `${PRESCRIPTIONS}/rx-created` },
    ]);
    // The create body carries the resolved visit + patient; the update carries clinical.
    expect(bodyOf('POST', PRESCRIPTIONS)).toMatchObject({
      visit_id: 'visit-1',
      patient_id: 'patient-1',
    });
    expect(bodyOf('PUT', `${PRESCRIPTIONS}/rx-created`)).toHaveProperty('clinical');
  });

  it('updates directly when a prescription id is already known (no fetch, no create)', async () => {
    await saveOpdPrescriptionDraft('visit-1', 'patient-1', emptyDraftFormData(), 'rx-existing');

    expect(recordedCalls()).toEqual([{ method: 'PUT', url: `${PRESCRIPTIONS}/rx-existing` }]);
  });
});

describe('endConsultation (normalized finalize + visit status)', () => {
  it('updates, finalizes, then marks the registration visit completed', async () => {
    const session = await endConsultation(
      'visit-1',
      'patient-1',
      emptyDraftFormData(),
      'rx-existing',
    );

    expect(session.prescription_status).toBe('final');
    expect(recordedCalls()).toEqual([
      { method: 'PUT', url: `${PRESCRIPTIONS}/rx-existing` },
      { method: 'POST', url: `${PRESCRIPTIONS}/rx-existing/finalize` },
    ]);
    expect(updateVisitStatusMock).toHaveBeenCalledWith('visit-1', 'completed');
  });

  it('creates-then-finalizes when no prescription id is known (Start RX end)', async () => {
    const session = await endConsultation('visit-1', 'patient-1', emptyDraftFormData(), null);

    expect(session.prescription_status).toBe('final');
    expect(recordedCalls()).toEqual([
      { method: 'GET', url: `${PRESCRIPTIONS}/by-visit/visit-1` },
      { method: 'POST', url: PRESCRIPTIONS },
      { method: 'PUT', url: `${PRESCRIPTIONS}/rx-created` },
      { method: 'POST', url: `${PRESCRIPTIONS}/rx-created/finalize` },
    ]);
    expect(updateVisitStatusMock).toHaveBeenCalledWith('visit-1', 'completed');
  });

  it('wraps a prescription-side ApiError (and does not touch visit status)', async () => {
    apiClientMock.mockImplementation((async (path: string, options?: RequestInit) => {
      const method = (options?.method ?? 'GET').toUpperCase();
      if (method === 'PUT' && pathOnly(path).includes('/prescriptions/')) {
        throw new ApiError(503, 'OPD down');
      }
      throw new Error(`unexpected apiClient call: ${method} ${pathOnly(path)}`);
    }) as typeof apiClient);

    await expect(
      endConsultation('visit-1', 'patient-1', emptyDraftFormData(), 'rx-existing'),
    ).rejects.toMatchObject({
      message: expect.stringContaining('Could not save prescription (503)'),
      cause: expect.any(ApiError),
    });
    expect(updateVisitStatusMock).not.toHaveBeenCalled();
  });

  it('reports a visit-status failure after the prescription is already final', async () => {
    updateVisitStatusMock.mockRejectedValueOnce(new Error('registration unreachable'));

    await expect(
      endConsultation('visit-1', 'patient-1', emptyDraftFormData(), 'rx-existing'),
    ).rejects.toMatchObject({
      message: expect.stringContaining('Prescription saved but visit status was not updated'),
    });
  });
});
