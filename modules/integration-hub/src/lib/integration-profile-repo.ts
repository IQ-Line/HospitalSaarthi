import type { TenantIntegrationProfile } from "./integration-context.js";

/** Read active ABDM profile — HTTP client to configurator-svc in Code PR 2. */
export interface IntegrationProfileRepo {
  findActiveByTenantId(iqTenantId: string): Promise<TenantIntegrationProfile | undefined>;
  findActiveByHipId(hipId: string): Promise<TenantIntegrationProfile | undefined>;
  findAllActiveAbdm(): Promise<TenantIntegrationProfile[]>;
}

export class NotImplementedIntegrationProfileRepo implements IntegrationProfileRepo {
  async findActiveByTenantId(): Promise<TenantIntegrationProfile | undefined> {
    throw new Error("IntegrationProfileRepo is not wired until Code PR 2");
  }

  async findActiveByHipId(): Promise<TenantIntegrationProfile | undefined> {
    throw new Error("IntegrationProfileRepo is not wired until Code PR 2");
  }

  async findAllActiveAbdm(): Promise<TenantIntegrationProfile[]> {
    throw new Error("IntegrationProfileRepo is not wired until Code PR 2");
  }
}
