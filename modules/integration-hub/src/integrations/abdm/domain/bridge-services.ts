/** ABDM gateway §3.2.7 — Find services by bridge id. */

export interface NhaBridgeService {
  id: string;
  name?: string;
  types: string[];
  endpoints?: Record<string, unknown>;
}

export interface NhaBridgeInfo {
  id: string;
  name?: string;
  url?: string;
  active?: boolean;
  blocklisted?: boolean;
}

export interface NhaBridgeServicesResponse {
  bridge: NhaBridgeInfo;
  services: NhaBridgeService[];
}
