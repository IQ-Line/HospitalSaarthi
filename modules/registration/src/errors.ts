export class RegistrationNotFoundError extends Error {
  readonly statusCode = 404;
  constructor(registrationId: string) {
    super(`Registration not found: ${registrationId}`);
    this.name = "RegistrationNotFoundError";
  }
}

/** New-patient intake requires an injected EMPI gateway. */
export class EmpiPatientGatewayNotConfiguredError extends Error {
  readonly statusCode = 503;
  constructor() {
    super(
      "New-patient intake is not available: configure EmpiPatientsPort on the registration service.",
    );
    this.name = "EmpiPatientGatewayNotConfiguredError";
  }
}
