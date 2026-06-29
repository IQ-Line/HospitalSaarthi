import { beforeEach, describe, expect, it, vi } from 'vitest';

// Same minimal boundary mocks as the create-rx opd-prescription test: a stubbed
// `apiClient` (+ real `ApiError`), tenant resolver, auth store, and registrations.
// `saveNursePreConsult` delegates to the REAL normalized `saveOpdPrescriptionDraft`,
// so we exercise the actual fetch-or-create -> update plumbing end to end.
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
  useAuthStore: { getState: () => ({ userId: 'nurse-1', accessToken: null }) },
}));

import { apiClient, ApiError } from '@/lib/api-client';
import type { OpdPrescriptionDetail } from '../../../../../src/features/create-rx/api/opd-prescription-types';
import { saveNursePreConsult } from '../../../../../src/features/nurse/api/nurse-prescription';
import { emptyDraftFormData } from '../../../../../src/features/create-rx/lib/opd-prescription-mapper';

const apiClientMock = vi.mocked(apiClient);
const PRESCRIPTIONS = '/api/v1/opd/prescriptions';

function makeDetail(overrides: Partial<OpdPrescriptionDetail> = {}): OpdPrescriptionDetail {
  return {
    id: 'rx-1',
    tenant_id: 'tenant-1',
    visit_id: 'visit-1',
    patient_id: 'patient-1',
    doctor_id: 'nurse-1',
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

function pathOnly(path: string): string {
  return path.split('?')[0] ?? path;
}

function recordedCalls(): Array<{ method: string; url: string }> {
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

beforeEach(() => {
  vi.clearAllMocks();
  apiClientMock.mockImplementation((async (path: string, options?: RequestInit) => {
    const method = (options?.method ?? 'GET').toUpperCase();
    const url = pathOnly(path);
    if (method === 'GET' && url.includes('/prescriptions/by-visit/')) {
      throw new ApiError(404, 'no draft for visit');
    }
    if (method === 'POST' && url.endsWith('/prescriptions')) {
      return { data: makeDetail({ id: 'rx-created', status: 'draft' }) };
    }
    if (method === 'PUT' && url.includes('/prescriptions/')) {
      return { data: makeDetail({ id: 'rx-created', status: 'draft' }) };
    }
    throw new Error(`unexpected apiClient call: ${method} ${url}`);
  }) as typeof apiClient);
});

describe('saveNursePreConsult (normalized fetch-or-create + update)', () => {
  it('creates a draft for the visit + patient when none exists, then updates it', async () => {
    const session = await saveNursePreConsult('visit-1', 'patient-7', emptyDraftFormData());

    expect(session.prescription_id).toBe('rx-created');
    expect(recordedCalls()).toEqual([
      { method: 'GET', url: `${PRESCRIPTIONS}/by-visit/visit-1` },
      { method: 'POST', url: PRESCRIPTIONS },
      { method: 'PUT', url: `${PRESCRIPTIONS}/rx-created` },
    ]);
  });

  it('threads the passed patientId (and visitId) into the create body', async () => {
    await saveNursePreConsult('visit-9', 'patient-7', emptyDraftFormData());

    const createBody = bodyOf('POST', PRESCRIPTIONS);
    expect(createBody?.patient_id).toBe('patient-7');
    expect(createBody?.visit_id).toBe('visit-9');
    // The update carries the clinical payload the mapper produced from the form.
    const updateBody = bodyOf('PUT', `${PRESCRIPTIONS}/rx-created`);
    expect(updateBody).toHaveProperty('clinical');
  });

  it('reuses an existing draft (no create) when one already exists for the visit', async () => {
    apiClientMock.mockImplementationOnce((async () => ({
      data: makeDetail({ id: 'rx-existing', status: 'draft' }),
    })) as typeof apiClient);

    await saveNursePreConsult('visit-1', 'patient-7', emptyDraftFormData());

    expect(recordedCalls()).toEqual([
      { method: 'GET', url: `${PRESCRIPTIONS}/by-visit/visit-1` },
      { method: 'PUT', url: `${PRESCRIPTIONS}/rx-existing` },
    ]);
  });
});
