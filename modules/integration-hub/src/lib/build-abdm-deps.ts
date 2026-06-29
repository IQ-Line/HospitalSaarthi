import { HttpGatewayClient } from "../integrations/abdm/data-access/gateway-client.http.js";
import { EnvSecretsClient } from "../integrations/abdm/data-access/env-secrets.client.js";
import { createSmsClientFromProfile } from "../integrations/abdm/data-access/sms-client.js";
import type { AbdmAdapterDeps, GatewayClient } from "../integrations/abdm/ports.js";
import type { IntegrationContext, TenantIntegrationProfile } from "./integration-context.js";
import { IntegrationProfileNotFoundError } from "./integration-hub-errors.js";
import type { IntegrationProfileRepo } from "./integration-profile-repo.js";
import {
  createSecretsClientFromProfile,
  PROFILE_CLIENT_ID_REF,
  PROFILE_CLIENT_SECRET_REF,
} from "./per-tenant-secrets.js";
import type { EventBus } from "@hims/ts-sdk-events";
import type { DbInstance } from "@hims/ts-sdk-db";
import type {
  AbdmSessionsPort,
  ConsentArtefactsPort,
  EmpiClient,
  RegistrationClient,
  FideliusEncryptor,
  HipDataPushClient,
  InboundMessagesPort,
  LinkOtpStorePort,
  LinkTokensPort,
  CareContextLinkStatePort,
  M3ConsentArtefactsHiuPort,
  M3ConsentRequestsPort,
  M3DataTransfersPort,
  PayloadEncryptor,
  RecordFoundationClient,
} from "../integrations/abdm/ports.js";

export interface IntegrationHubDeploymentConfig {
  gatewayBaseUrl: string;
  abhaApiBaseUrl: string;
  productionGatewayBaseUrl?: string;
  productionAbhaApiBaseUrl?: string;
  gatewayTimeoutMs?: number;
}

/** Process-wide singletons — constructed once in integration-hub-svc (Code PR 3). */
export interface IntegrationHubSharedInfra {
  profiles: IntegrationProfileRepo;
  deployment: IntegrationHubDeploymentConfig;
  db?: DbInstance;
  sessions: AbdmSessionsPort;
  inboundMessages: InboundMessagesPort;
  linkTokens: LinkTokensPort;
  consentArtefacts: ConsentArtefactsPort;
  m3ConsentRequests: M3ConsentRequestsPort;
  m3ConsentArtefactsHiu: M3ConsentArtefactsHiuPort;
  m3DataTransfers: M3DataTransfersPort;
  empi: EmpiClient;
  registration: RegistrationClient;
  recordFoundation: RecordFoundationClient;
  careContextLinkState: CareContextLinkStatePort;
  fidelius: FideliusEncryptor;
  payloadEncryptor: PayloadEncryptor;
  linkOtpStore: LinkOtpStorePort;
  dataPush?: HipDataPushClient;
  eventBus?: EventBus;
}

function resolveGatewayUrls(
  profile: TenantIntegrationProfile,
  deployment: IntegrationHubDeploymentConfig,
): { gatewayBaseUrl: string; abhaApiBaseUrl: string } {
  if (profile.gatewayEnvironment === "production") {
    const gatewayBaseUrl =
      deployment.productionGatewayBaseUrl?.trim() || deployment.gatewayBaseUrl;
    const abhaApiBaseUrl =
      deployment.productionAbhaApiBaseUrl?.trim() || deployment.abhaApiBaseUrl;
    return { gatewayBaseUrl, abhaApiBaseUrl };
  }
  return {
    gatewayBaseUrl: deployment.gatewayBaseUrl,
    abhaApiBaseUrl: deployment.abhaApiBaseUrl,
  };
}

function parseGatewayEnvironment(value: string): "sandbox" | "production" {
  return value === "production" ? "production" : "sandbox";
}

export function mapConfiguratorProfileRow(
  row: Record<string, unknown>,
): TenantIntegrationProfile {
  return {
    id: String(row["id"]),
    iqTenantId: String(row["iq_tenant_id"]),
    integrationKind: "abdm",
    hipId: String(row["hip_id"]),
    hiuId: String(row["hiu_id"]),
    cmId: String(row["cm_id"] ?? "sbx"),
    clientId: (row["client_id"] as string | null) ?? null,
    clientSecret: (row["client_secret"] as string | null) ?? null,
    defaultSmsPhone: (row["default_sms_phone"] as string | null) ?? null,
    hipDisplayName: (row["hip_display_name"] as string | null) ?? null,
    callbackBaseUrl: (row["callback_base_url"] as string | null) ?? null,
    smsProvider: (row["sms_provider"] as string | null) ?? null,
    smsConfig: (row["sms_config"] as Record<string, unknown>) ?? {},
    gatewayEnvironment: parseGatewayEnvironment(String(row["gateway_environment"] ?? "sandbox")),
  };
}

export interface BuildAbdmDepsOptions {
  /** When already loaded (e.g. HIP callback path), skips a second configurator HTTP round-trip. */
  profile?: TenantIntegrationProfile;
}

/** Builds per-tenant deps and profile — call per request / callback / event. */
export async function buildAbdmDepsForTenant(
  iqTenantId: string,
  shared: IntegrationHubSharedInfra,
  options?: BuildAbdmDepsOptions,
): Promise<IntegrationContext> {
  const profile =
    options?.profile ?? (await shared.profiles.findActiveByTenantId(iqTenantId));
  if (!profile) {
    throw new IntegrationProfileNotFoundError(iqTenantId);
  }
  if (profile.iqTenantId !== iqTenantId) {
    throw new IntegrationProfileNotFoundError(
      iqTenantId,
      `profile tenant mismatch (expected ${iqTenantId}, got ${profile.iqTenantId})`,
    );
  }

  const { gatewayBaseUrl, abhaApiBaseUrl } = resolveGatewayUrls(profile, shared.deployment);
  const secrets = createSecretsClientFromProfile(profile);
  const gateway = new HttpGatewayClient({
    gatewayBaseUrl,
    abhaApiBaseUrl,
    xCmId: profile.cmId,
    secrets,
    clientIdRef: PROFILE_CLIENT_ID_REF,
    clientSecretRef: PROFILE_CLIENT_SECRET_REF,
  });

  const deps: AbdmAdapterDeps = {
    sessions: shared.sessions,
    inboundMessages: shared.inboundMessages,
    linkTokens: shared.linkTokens,
    consentArtefacts: shared.consentArtefacts,
    m3ConsentRequests: shared.m3ConsentRequests,
    m3ConsentArtefactsHiu: shared.m3ConsentArtefactsHiu,
    m3DataTransfers: shared.m3DataTransfers,
    empi: shared.empi,
    registration: shared.registration,
    recordFoundation: shared.recordFoundation,
    careContextLinkState: shared.careContextLinkState,
    fidelius: shared.fidelius,
    payloadEncryptor: shared.payloadEncryptor,
    dataPush: shared.dataPush,
    eventBus: shared.eventBus,
    linkOtpStore: shared.linkOtpStore,
    gateway,
    secrets,
    sms: createSmsClientFromProfile(profile),
    xHipId: profile.hipId,
    xHiuId: profile.hiuId,
    xCmId: profile.cmId,
    defaultSmsPhoneNo: profile.defaultSmsPhone ?? undefined,
    hipDisplayName: profile.hipDisplayName ?? undefined,
  };

  return { iqTenantId, profile, deps };
}

function resolveDeploymentCmId(): string {
  return (
    process.env["INTEGRATION_HUB_ABDM_X_CM_ID"]?.trim() ||
    process.env["ABDM_X_CM_ID"]?.trim() ||
    "sbx"
  );
}

/** Deployment-level gateway client using env OAuth credentials (no tenant profile). */
export function buildDeploymentGatewayClient(
  shared: IntegrationHubSharedInfra,
): GatewayClient {
  const secrets = new EnvSecretsClient();
  return new HttpGatewayClient({
    gatewayBaseUrl: shared.deployment.gatewayBaseUrl,
    abhaApiBaseUrl: shared.deployment.abhaApiBaseUrl,
    xCmId: resolveDeploymentCmId(),
    secrets,
  });
}
