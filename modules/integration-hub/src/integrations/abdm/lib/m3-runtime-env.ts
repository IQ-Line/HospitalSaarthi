import { stripTrailingSlashes } from "./http-url.js";

export function isM3MockGateway(): boolean {
  return process.env["ABDM_M3_MOCK_GATEWAY"] === "true";
}

export function isM3LoopbackHiu(): boolean {
  return process.env["ABDM_M3_LOOPBACK_HIU"] === "true";
}

export function m3DataPushUrlAllowlist(): string[] {
  const raw = process.env["ABDM_M3_DATA_PUSH_URL_ALLOWLIST"]?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

/** True only for mock harness (`ABDM_M3_MOCK_GATEWAY=true`). Inbound JWS bypass is separate. */
export function skipM3OutboundGateway(): boolean {
  return isM3MockGateway();
}

export function m3AdapterPublicBaseUrl(): string {
  const port =
    process.env["INTEGRATION_HUB_SVC_PORT"] ??
    process.env["ABDM_ADAPTER_SVC_PORT"] ??
    "3007";
  const fromEnv =
    process.env["ABDM_ADAPTER_PUBLIC_BASE_URL"]?.trim() ||
    process.env["INTEGRATION_HUB_PUBLIC_BASE_URL"]?.trim();
  return fromEnv ? stripTrailingSlashes(fromEnv) : `http://localhost:${port}`;
}

/**
 * Minimal push headers (Content-Type only) — production direct-transfer parity.
 * `true`/`false` forces; unset auto-detects external CM transfer endpoints.
 */
export function m3DataPushMinimalHeaders(
  targetUrl: string,
  adapterBaseUrl: string,
): boolean {
  const forced = process.env["ABDM_M3_DATA_PUSH_MINIMAL_HEADERS"]?.trim();
  if (forced === "true") return true;
  if (forced === "false") return false;

  try {
    const targetHost = new URL(targetUrl).hostname.toLowerCase();
    const adapterHost = new URL(adapterBaseUrl).hostname.toLowerCase();
    return !(targetHost === adapterHost || targetHost === "localhost");
  } catch {
    return false;
  }
}
