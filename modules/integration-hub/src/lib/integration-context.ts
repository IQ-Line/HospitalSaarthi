import type { AbdmAdapterDeps } from "../integrations/abdm/ports.js";

/** Per-tenant ABDM profile row (mirrors configurator.tenant_integration_profiles). */
export interface TenantIntegrationProfile {
  id: string;
  iqTenantId: string;
  integrationKind: "abdm";
  hipId: string;
  hiuId: string;
  cmId: string;
  clientId: string | null;
  clientSecret: string | null;
  defaultSmsPhone: string | null;
  hipDisplayName: string | null;
  callbackBaseUrl: string | null;
  smsProvider: string | null;
  smsConfig: Record<string, unknown>;
  gatewayEnvironment: string;
}

export interface IntegrationContext {
  iqTenantId: string;
  profile: TenantIntegrationProfile;
  deps: AbdmAdapterDeps;
}

declare module "fastify" {
  interface FastifyRequest {
    integrationCtx?: IntegrationContext;
  }
}
