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

export class GrnNotFoundError extends InventoryError {
  constructor() {
    super("GRN not found", 404, "NOT_FOUND");
  }
}

export class GrnValidationError extends InventoryError {
  constructor(message: string) {
    super(message, 422, "VALIDATION_ERROR");
  }
}

export class ItemNotFoundError extends InventoryError {
  constructor() {
    super("Item not found", 404, "NOT_FOUND");
  }
}

export class IndentNotFoundError extends InventoryError {
  constructor() {
    super("Indent not found", 404, "NOT_FOUND");
  }
}

export class IndentValidationError extends InventoryError {
  constructor(message: string) {
    super(message, 422, "VALIDATION_ERROR");
  }
}

