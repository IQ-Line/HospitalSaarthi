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

export class StoreNotFoundError extends InventoryError {
  constructor() {
    super("No store with this id.", 404, "NOT_FOUND");
  }
}

export class StoreTypeNotFoundError extends InventoryError {
  constructor() {
    super("No active store type with this id.", 404, "NOT_FOUND");
  }
}

export class StoreValidationError extends InventoryError {
  constructor(message: string) {
    super(message, 400, "VALIDATION_ERROR");
  }
}

export class StoreConflictError extends InventoryError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
  }
}
