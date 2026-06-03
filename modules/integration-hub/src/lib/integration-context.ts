import type { AbdmAdapterDeps } from "../integrations/abdm/ports.js";

/**
 * Per-tenant ABDM profile row.
 * Keep field semantics aligned with `TenantIntegrationProfile` in `@hims/configurator`
 * (`modules/configurator/src/domain/tenant-integration-profile.types.ts`).
 */
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
  gatewayEnvironment: "sandbox" | "production";
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
