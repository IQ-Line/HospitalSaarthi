import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveDatabaseUrl } from "./resolve-database-url.js";

const serviceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(serviceRoot, "../..");

// Root `.env` then service `.env` wins. Use override so file values replace empty
// placeholders Nx/envFile may inject before this module runs.
config({ path: path.join(repoRoot, ".env"), override: true });
config({ path: path.join(serviceRoot, ".env"), override: true });

export { serviceRoot };

/** Copy env between legacy `ABDM_*` and `INTEGRATION_HUB_*` names (bidirectional). */
function syncEnvPair(oldKey: string, newKey: string): void {
  if (!process.env[newKey]?.trim() && process.env[oldKey]?.trim()) {
    process.env[newKey] = process.env[oldKey];
  }
  if (!process.env[oldKey]?.trim() && process.env[newKey]?.trim()) {
    process.env[oldKey] = process.env[newKey];
  }
}

/**
 * Map informal Postman-style keys and align legacy/new integration-hub env names.
 * See docs/architecture/lld/integration-hub/01-phase-1a-restructure-and-multi-tenant.md §7.
 */
export function normalizeIntegrationHubEnvAliases(): void {
  if (!process.env["ABDM_SANDBOX_CLIENT_ID"] && process.env["clientId"]) {
    process.env["ABDM_SANDBOX_CLIENT_ID"] = process.env["clientId"];
  }
  if (!process.env["ABDM_SANDBOX_CLIENT_SECRET"] && process.env["clientSecret"]) {
    process.env["ABDM_SANDBOX_CLIENT_SECRET"] = process.env["clientSecret"];
  }

  const pairs: Array<[string, string]> = [
    ["ABDM_ADAPTER_SVC_PORT", "INTEGRATION_HUB_SVC_PORT"],
    ["ABDM_DATA_DATABASE_URL", "INTEGRATION_HUB_DATABASE_URL"],
    ["ABDM_GATEWAY_BASE_URL", "INTEGRATION_HUB_ABDM_GATEWAY_BASE_URL"],
    ["ABDM_ABHA_API_BASE_URL", "INTEGRATION_HUB_ABDM_ABHA_API_BASE_URL"],
    ["ABDM_GATEWAY_JWKS_URL", "INTEGRATION_HUB_ABDM_GATEWAY_JWKS_URL"],
    ["ABDM_FIDELIUS_USE_STUB", "INTEGRATION_HUB_ABDM_FIDELIUS_USE_STUB"],
    ["ABDM_M3_MOCK_GATEWAY", "INTEGRATION_HUB_ABDM_M3_MOCK_GATEWAY"],
    ["ABDM_M3_LOOPBACK_HIU", "INTEGRATION_HUB_ABDM_M3_LOOPBACK_HIU"],
    ["ABDM_M3_DATA_PUSH_URL_ALLOWLIST", "INTEGRATION_HUB_ABDM_M3_DATA_PUSH_URL_ALLOWLIST"],
    ["ABDM_JANITOR_INTERVAL_MS", "INTEGRATION_HUB_JANITOR_INTERVAL_MS"],
    ["ABDM_SESSION_TTL_HOURS", "INTEGRATION_HUB_ABDM_SESSION_TTL_HOURS"],
    ["ABDM_GATEWAY_TIMEOUT_MS", "INTEGRATION_HUB_ABDM_GATEWAY_TIMEOUT_MS"],
    ["ABDM_TOKEN_ENCRYPTION_KEY", "INTEGRATION_HUB_TOKEN_ENCRYPTION_KEY"],
    ["ABDM_ALLOW_INSECURE_CALLBACKS", "INTEGRATION_HUB_ALLOW_INSECURE_CALLBACKS"],
    ["ABDM_ALLOW_PLAINTEXT_TOKENS", "INTEGRATION_HUB_ALLOW_PLAINTEXT_TOKENS"],
    ["ABDM_OTP_RATE_LIMIT_MAX", "INTEGRATION_HUB_ABDM_OTP_RATE_LIMIT_MAX"],
    ["ABDM_OTP_RATE_LIMIT_WINDOW_SEC", "INTEGRATION_HUB_ABDM_OTP_RATE_LIMIT_WINDOW_SEC"],
    ["ABDM_LINK_TOKEN_ACQUIRE_TIMEOUT_MS", "INTEGRATION_HUB_ABDM_LINK_TOKEN_ACQUIRE_TIMEOUT_MS"],
    ["ABDM_M3_CONSENT_REQUEST_EXPIRY_HOURS", "INTEGRATION_HUB_ABDM_M3_CONSENT_REQUEST_EXPIRY_HOURS"],
    ["ABDM_GATEWAY_OPENID_JWKS_URI", "INTEGRATION_HUB_ABDM_GATEWAY_OPENID_JWKS_URI"],
    ["ABDM_GATEWAY_JWT_ISSUER", "INTEGRATION_HUB_ABDM_GATEWAY_JWT_ISSUER"],
    ["ABDM_GATEWAY_JWT_AUDIENCE", "INTEGRATION_HUB_ABDM_GATEWAY_JWT_AUDIENCE"],
    ["ABDM_CM_CONSENT_VERIFY_CERT_PEM", "INTEGRATION_HUB_ABDM_CM_CONSENT_VERIFY_CERT_PEM"],
    ["ABDM_M3_AWAITING_PUSH_HOURS", "INTEGRATION_HUB_ABDM_M3_AWAITING_PUSH_HOURS"],
    ["ABDM_M2_MOCK_PLATFORM", "INTEGRATION_HUB_ABDM_M2_MOCK_PLATFORM"],
    ["ABDM_MOCK_ABHA_ADDRESS", "INTEGRATION_HUB_ABDM_MOCK_ABHA_ADDRESS"],
    ["ABDM_M3_PUSH_CHECKSUM_MODE", "INTEGRATION_HUB_ABDM_M3_PUSH_CHECKSUM_MODE"],
    ["ABDM_M3_DATA_PUSH_MINIMAL_HEADERS", "INTEGRATION_HUB_ABDM_M3_DATA_PUSH_MINIMAL_HEADERS"],
    ["ABDM_M3_KEYPAIR_TTL_HOURS", "INTEGRATION_HUB_ABDM_M3_KEYPAIR_TTL_HOURS"],
    ["ABDM_M3_PUSH_TIMEOUT_MS", "INTEGRATION_HUB_ABDM_M3_PUSH_TIMEOUT_MS"],
    ["ABDM_M3_PUSH_TOTAL_TIMEOUT_MS", "INTEGRATION_HUB_ABDM_M3_PUSH_TOTAL_TIMEOUT_MS"],
    ["ABDM_LINK_TOKEN_POLL_INTERVAL_MS", "INTEGRATION_HUB_ABDM_LINK_TOKEN_POLL_INTERVAL_MS"],
    ["ABDM_LINK_TOKEN_POLL_MAX_INTERVAL_MS", "INTEGRATION_HUB_ABDM_LINK_TOKEN_POLL_MAX_INTERVAL_MS"],
    ["ABDM_MOCK_PATIENT_ID", "INTEGRATION_HUB_ABDM_MOCK_PATIENT_ID"],
    ["ABDM_DEV_INBOUND_SIMULATION", "INTEGRATION_HUB_ABDM_DEV_INBOUND_SIMULATION"],
    ["ABDM_ADAPTER_PUBLIC_BASE_URL", "INTEGRATION_HUB_PUBLIC_BASE_URL"],
  ];

  for (const [oldKey, newKey] of pairs) {
    syncEnvPair(oldKey, newKey);
  }
}

export function resolveDatabaseUrlFromEnv(): string {
  return resolveDatabaseUrl();
}

/** Dev-only: `INTEGRATION_HUB_M3_MOCK_SERVE=true` forces mock M3 after `.env` load (for `full-loop.sh` on a spare port). */
if (process.env["INTEGRATION_HUB_M3_MOCK_SERVE"] === "true") {
  const mockPort = process.env["INTEGRATION_HUB_M3_MOCK_PORT"]?.trim() || "3008";
  process.env["INTEGRATION_HUB_SVC_PORT"] = mockPort;
  process.env["ABDM_ADAPTER_SVC_PORT"] = mockPort;
  process.env["ABDM_M3_MOCK_GATEWAY"] = "true";
  process.env["INTEGRATION_HUB_ABDM_M3_MOCK_GATEWAY"] = "true";
  process.env["ABDM_M3_LOOPBACK_HIU"] = "true";
  process.env["INTEGRATION_HUB_ABDM_M3_LOOPBACK_HIU"] = "true";
}
