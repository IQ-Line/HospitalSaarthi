export class IntegrationProfileNotFoundError extends Error {
  readonly statusCode = 404;
  readonly code = "INTEGRATION_PROFILE_NOT_FOUND";

  constructor(
    readonly iqTenantId: string,
    message?: string,
  ) {
    super(message ?? `no active ABDM integration profile for tenant ${iqTenantId}`);
    this.name = "IntegrationProfileNotFoundError";
  }
}

export class IntegrationContextMissingError extends Error {
  readonly statusCode = 503;
  readonly code = "INTEGRATION_CONTEXT_MISSING";

  constructor(message = "integration context not resolved — ensure integrationContextResolver ran") {
    super(message);
    this.name = "IntegrationContextMissingError";
  }
}
