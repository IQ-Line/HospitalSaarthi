/** Result of validating a tenant integration API key (Configurator `tenant_api_keys`). */
export interface TenantApiKeyValidationResult {
  tenantId: string;
  apiKeyId: string;
  purpose: "opd_slip";
}

export interface TenantApiKeyValidatorPort {
  validateOpdSlipKey(
    prefix: string,
    secret: string,
  ): Promise<TenantApiKeyValidationResult | null>;
}
