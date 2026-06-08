export class IntegrationNotFoundError extends Error {
  readonly code = "integration_not_found" as const;

  constructor(readonly integrationId: string) {
    super(`Integration not found: ${integrationId}`);
    this.name = "IntegrationNotFoundError";
  }
}

export class IntegrationApiKeyNotFoundError extends Error {
  readonly code = "integration_api_key_not_found" as const;

  constructor(readonly apiKeyId: string) {
    super(`Integration API key not found: ${apiKeyId}`);
    this.name = "IntegrationApiKeyNotFoundError";
  }
}

export class IntegrationValidationError extends Error {
  constructor(
    readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "IntegrationValidationError";
  }
}

export class IntegrationStateError extends Error {
  constructor(
    readonly code: string,
    readonly currentStatus: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "IntegrationStateError";
  }
}

export class PartnerOrchestrationError extends Error {
  readonly code = "partner_orchestration_failed" as const;

  constructor(
    readonly integrationId: string,
    readonly upstreamStatus: number,
    readonly upstreamBody: unknown,
    message?: string,
  ) {
    super(message ?? `Partner orchestration failed for integration ${integrationId}`);
    this.name = "PartnerOrchestrationError";
  }
}
