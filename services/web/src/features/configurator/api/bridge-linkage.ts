import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { configuratorKeys } from './query-keys';

const BRIDGE_SERVICES_PATH = '/api/abdm/v1/m0/bridge-services';
const MAPPED_FACILITY_IDS_PATH = '/api/abdm/v1/tenant/mapped-facility-ids';

/** Omit tenant headers — deployment sandbox bridge credentials (SBXID_*). */
const BRIDGE_DISCOVERY_CONTEXT = { tenantIdOverride: null } as const;

export interface NhaBridgeInfo {
  id: string;
  name?: string;
  url?: string;
  active?: boolean;
  blocklisted?: boolean;
}

export interface NhaBridgeService {
  id: string;
  name?: string;
  types: string[];
  active?: boolean;
  endpoints?: Record<string, unknown>;
}

export interface NhaBridgeServicesResponse {
  bridge: NhaBridgeInfo;
  services: NhaBridgeService[];
}

export interface MappedFacilityIdsResponse {
  success: boolean;
  data: string[];
}

export interface BridgeFacilityRow {
  id: string;
  name: string;
  types: string[];
  active: boolean;
  abdmLive: boolean;
}

export interface BridgeFacilityLinkageData {
  bridge: NhaBridgeInfo | null;
  services: BridgeFacilityRow[];
}

export function fetchBridgeServices(): Promise<NhaBridgeServicesResponse> {
  return apiClient<NhaBridgeServicesResponse>(
    BRIDGE_SERVICES_PATH,
    {},
    BRIDGE_DISCOVERY_CONTEXT,
  );
}

export function fetchMappedFacilityIds(): Promise<MappedFacilityIdsResponse> {
  return apiClient<MappedFacilityIdsResponse>(
    MAPPED_FACILITY_IDS_PATH,
    {},
    BRIDGE_DISCOVERY_CONTEXT,
  );
}

async function loadBridgeFacilityLinkage(): Promise<BridgeFacilityLinkageData> {
  const bridgeRes = await fetchBridgeServices();
  let mappedIds = new Set<string>();
  try {
    const mapped = await fetchMappedFacilityIds();
    if (mapped.success && Array.isArray(mapped.data)) {
      mappedIds = new Set(mapped.data.map((id) => String(id).trim()));
    }
  } catch {
    // Mapped IDs are optional for the table; bridge services remain visible.
  }

  const services = (bridgeRes.services ?? []).map((service) => {
    const id = String(service.id).trim();
    return {
      id,
      name: service.name?.trim() || id,
      types: service.types ?? [],
      active: service.active ?? true,
      abdmLive: mappedIds.has(id),
    };
  });

  return {
    bridge: bridgeRes.bridge ?? null,
    services,
  };
}

export function useBridgeFacilityLinkage(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: configuratorKeys.bridgeLinkage(),
    queryFn: loadBridgeFacilityLinkage,
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
  });
}
