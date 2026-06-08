import {
  createMockAdmission,
  getMockAdmissionById,
  getMockAdmissionsList,
  MOCK_WARDS,
  updateMockAdmission,
} from '../mock/admissions';
import type {
  AdmissionDetail,
  AdmissionFormInput,
  AdmissionsListParams,
  AdmissionsListResponse,
  WardBeds,
} from '../types';

/** UI-only until `specs/openapi/ipd.v1.yaml` backend is wired. */
export function ipdUseMock(): boolean {
  return import.meta.env.VITE_IPD_USE_MOCK !== 'false';
}

export async function fetchAdmissionsList(
  params: AdmissionsListParams,
): Promise<AdmissionsListResponse> {
  if (ipdUseMock()) {
    await new Promise((r) => setTimeout(r, 120));
    return getMockAdmissionsList(params);
  }
  throw new Error('IPD admissions API not implemented — set VITE_IPD_USE_MOCK=true');
}

export async function fetchWardBeds(): Promise<WardBeds[]> {
  if (ipdUseMock()) return MOCK_WARDS;
  throw new Error('IPD bed API not implemented');
}

export async function fetchAdmissionById(id: string): Promise<AdmissionDetail | null> {
  if (ipdUseMock()) {
    await new Promise((r) => setTimeout(r, 80));
    return getMockAdmissionById(id);
  }
  throw new Error('IPD admission detail API not implemented');
}

export async function createAdmission(
  input: AdmissionFormInput,
): Promise<{ id: string; episodeNumber: string }> {
  if (ipdUseMock()) return createMockAdmission(input);
  throw new Error('IPD create admission API not implemented');
}

export async function updateAdmission(
  id: string,
  input: AdmissionFormInput,
): Promise<{ id: string; episodeNumber: string }> {
  if (ipdUseMock()) return updateMockAdmission(id, input);
  throw new Error('IPD update admission API not implemented');
}
