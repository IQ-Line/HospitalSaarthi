import { ApiError } from '@/lib/api-client';
import { formatApiErrorBody } from '@/lib/api-error-format';

/** User-visible message from failed mutateAsync / mutation errors. */
export function mutationErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return formatApiErrorBody(err.status, err.body);
  }
  if (err instanceof Error) return err.message;
  return 'Request failed';
}
