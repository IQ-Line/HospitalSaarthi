/**
 * Pure QR-value builder for the desk queue. Production emits a JSON payload the
 * ABHA PHR app scans; sandbox emits the phrsbx share-profile deep link. Mirrors
 * legacy abdi-lims-backed exactly (counter id fixed to "1").
 */

export function qrValue(profile: {
  hipId: string;
  hipDisplayName: string | null;
  gatewayEnvironment: string;
}): { qr_value: string; is_live: boolean } {
  const hipId = profile.hipId.trim();
  const isLive = profile.gatewayEnvironment === "production";
  const counterId = "1";
  if (isLive) {
    return {
      is_live: true,
      qr_value: JSON.stringify({
        hipId,
        code: counterId,
        facilityName: profile.hipDisplayName ?? "",
      }),
    };
  }
  const base = "https://phrsbx.abdm.gov.in";
  return {
    is_live: false,
    qr_value: `${base}/share-profile?hip-id=${encodeURIComponent(hipId)}&counter-id=${counterId}`,
  };
}
