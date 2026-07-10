import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import { abdmFetch } from '@/features/abha/api/abdm-client';
import { ApiError } from '@/lib/api-client';
import { mutationErrorMessage } from '@/lib/mutation-error';
import { useTenantStore } from '@/stores/tenant.store';
import type { CreateVisitRequestBody } from '@/features/frontdesk/types';

export type QueueSummary = {
  token_number: number;
  patient_name: string;
  phone_number: string;
  abha_address: string;
  abha_number: string;
  age_years: number | null;
  gender: string;
};

/**
 * Scan-share overlay: any top-level visit field may be prefilled, and the nested
 * `patient` / address blocks are themselves partial — a prefill rarely carries every
 * field of a block, and {@link mergeScanSharePrefill} shallow-merges each block onto
 * the current form values.
 */
export type VisitPrefill = Partial<
  Omit<CreateVisitRequestBody, 'patient' | 'permanent_address' | 'residential_address'>
> & {
  patient?: Partial<CreateVisitRequestBody['patient']>;
  permanent_address?: Partial<CreateVisitRequestBody['permanent_address']>;
  residential_address?: Partial<CreateVisitRequestBody['residential_address']>;
};

export type PrefillPayload = {
  token_number: number;
  prefill: VisitPrefill;
  freeze_abha?: boolean;
};

export type ScanShareStatus = {
  available: boolean;
  reason?: string;
  hip_id?: string;
  facility_name?: string | null;
  qr_value?: string;
  is_live?: boolean;
};

type ActiveResponse = {
  data: { patients: QueueSummary[]; running_token: number };
};

type PrefillResponse = { data: PrefillPayload };

type StatusResponse = { data: ScanShareStatus };

export const UNAVAILABLE_FALLBACK =
  'ABDM scan-and-share is unavailable. Ensure integration-hub-svc is running, the tenant has an ABDM profile, and migration 0005 is applied.';

const SCAN_SHARE_ACTIVE_STALE_MS = 30_000;

export async function fetchScanShareStatus(): Promise<ScanShareStatus> {
  try {
    const res = await abdmFetch<StatusResponse>('/scan-share/status');
    return res.data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return {
        available: false,
        reason:
          'No ABDM integration profile for this tenant. Configure HIP ID in Configurator.',
      };
    }
    return {
      available: false,
      reason: mutationErrorMessage(err) || UNAVAILABLE_FALLBACK,
    };
  }
}

export function useScanShareStatus() {
  const tenantId = useTenantStore((s) => s.tenantId ?? s.homeTenantId);
  return useQuery({
    queryKey: ['scan-share', 'status', tenantId],
    queryFn: fetchScanShareStatus,
    staleTime: 60_000,
    retry: 1,
  });
}

export async function fetchScanShareActive(): Promise<ActiveResponse['data']> {
  const res = await abdmFetch<ActiveResponse>('/scan-share/active');
  return res.data;
}

export function useScanShareActive(enabled: boolean) {
  const tenantId = useTenantStore((s) => s.tenantId ?? s.homeTenantId);
  return useQuery({
    queryKey: ['scan-share', 'active', tenantId],
    queryFn: fetchScanShareActive,
    enabled,
    staleTime: SCAN_SHARE_ACTIVE_STALE_MS,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}

export async function lookupScanShareToken(query: string): Promise<PrefillPayload> {
  const res = await abdmFetch<PrefillResponse>(
    `/scan-share/lookup?${new URLSearchParams({ q: query }).toString()}`,
  );
  return res.data;
}

export async function fetchScanSharePrefill(tokenNumber: number): Promise<PrefillPayload> {
  const res = await abdmFetch<PrefillResponse>(`/scan-share/token/${tokenNumber}/prefill`);
  return res.data;
}

export async function redeemScanShareToken(tokenNumber: number): Promise<void> {
  await abdmFetch(`/scan-share/token/${tokenNumber}/redeem`, { method: 'PUT' });
}

export function mergeScanSharePrefill(
  current: CreateVisitRequestBody,
  prefill: VisitPrefill,
): CreateVisitRequestBody {
  return {
    ...current,
    ...prefill,
    patient: { ...current.patient, ...prefill.patient },
    permanent_address: { ...current.permanent_address, ...prefill.permanent_address },
    residential_address: {
      ...current.residential_address,
      ...prefill.residential_address,
    },
  };
}

export async function submitScanShareTokenLookup(
  query: string,
  onApply: (payload: PrefillPayload) => void,
): Promise<void> {
  const q = query.trim();
  if (!q) return;
  try {
    const data = await lookupScanShareToken(q);
    onApply(data);
    toast.success(`Loaded token ${data.token_number}`);
  } catch {
    toast.error('No patient found for this token');
  }
}
