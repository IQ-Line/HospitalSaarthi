export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 500,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, 400, 'BAD_REQUEST');
  }
}

export class UpstreamError extends AppError {
  constructor(message: string, statusCode = 502) {
    super(message, statusCode, 'UPSTREAM_ERROR');
  }
}
