export class InventoryError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "InventoryError";
  }
}

export class InventoryValidationError extends InventoryError {
  constructor(message: string, code = "VALIDATION_ERROR") {
    super(message, 422, code);
    this.name = "InventoryValidationError";
  }
}
