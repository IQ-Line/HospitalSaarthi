export class BillingWriteError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly code: string,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "BillingWriteError";
  }
}
