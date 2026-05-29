/** Thrown when dashboard data cannot be loaded from backend APIs. */
export class DashboardDataUnavailableError extends Error {
  readonly code = 'DASHBOARD_DATA_UNAVAILABLE';

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'DashboardDataUnavailableError';
  }
}

export function isDashboardDataUnavailableError(
  error: unknown,
): error is DashboardDataUnavailableError {
  return error instanceof DashboardDataUnavailableError;
}
