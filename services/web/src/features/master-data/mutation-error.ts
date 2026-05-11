import { ApiError } from '@/lib/api-client';

/** User-visible message from failed mutateAsync / mutation errors. */
export function mutationErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body?.trim();
    if (body) return body.length > 280 ? `${body.slice(0, 280)}…` : body;
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Request failed';
}
