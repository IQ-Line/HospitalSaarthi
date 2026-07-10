/**
 * Resolve whether scan-and-share is available for a facility and, if so, the QR
 * value the desk should render. Mirrors the legacy `resolveScanShareStatus`
 * unavailability ladder (no HIP id → no DB → tables not migrated) verbatim; the
 * table probe is behind the repo so this use-case is pure.
 */

import type { ScanShareRepository } from "./ports.js";
import { qrValue } from "./qr.js";

export type ScanShareStatusData = {
  available: boolean;
  reason?: string;
  hip_id?: string;
  facility_name?: string | null;
  qr_value?: string;
  is_live?: boolean;
};

export async function getShareStatus(
  input: {
    profile: { hipId: string; hipDisplayName: string | null; gatewayEnvironment: string };
  },
  deps: { repo: ScanShareRepository | null },
): Promise<ScanShareStatusData> {
  const hipId = input.profile.hipId?.trim();
  if (!hipId) {
    return {
      available: false,
      reason:
        "ABDM HIP ID is not configured for this facility. Add an active integration profile in Configurator.",
    };
  }

  if (!deps.repo) {
    return {
      available: false,
      hip_id: hipId,
      reason: "Integration Hub database is not connected.",
    };
  }

  if (!(await deps.repo.tablesExist())) {
    return {
      available: false,
      hip_id: hipId,
      reason:
        "Scan-and-share tables are missing. Apply the drizzle journal migration 0002_abdm_scan_share via `npx nx run integration-hub:db-migrate`.",
    };
  }

  const qr = qrValue({
    hipId,
    hipDisplayName: input.profile.hipDisplayName,
    gatewayEnvironment: input.profile.gatewayEnvironment,
  });

  return {
    available: true,
    hip_id: hipId,
    facility_name: input.profile.hipDisplayName,
    qr_value: qr.qr_value,
    is_live: qr.is_live,
  };
}
