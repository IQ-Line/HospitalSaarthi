export class IntegrationHubControlPlaneError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "IntegrationHubControlPlaneError";
  }
}

export class IntegrationNotFoundError extends IntegrationHubControlPlaneError {
  constructor() {
    super("INTEGRATION_NOT_FOUND", "Integration not found for this tenant.");
  }
}

export class IntegrationConflictError extends IntegrationHubControlPlaneError {
  constructor(message = "Integration name already exists for this tenant.") {
    super("INTEGRATION_CONFLICT", message);
  }
}

export class IntegrationInvalidStateError extends IntegrationHubControlPlaneError {
  constructor(message: string) {
    super("INTEGRATION_INVALID_STATE", message);
  }
}

export class IntegrationTypeUnknownError extends IntegrationHubControlPlaneError {
  constructor(integrationType: string) {
    super("INTEGRATION_TYPE_UNKNOWN", `Unknown integration type: ${integrationType}`);
  }
}

export class ApiKeyNotFoundError extends IntegrationHubControlPlaneError {
  constructor() {
    super("API_KEY_NOT_FOUND", "API key not found for this integration.");
  }
}

export class PartnerOrchestrationError extends IntegrationHubControlPlaneError {
  constructor(message: string) {
    super("PARTNER_ORCHESTRATION_FAILED", message);
  }
}
