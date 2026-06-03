import { MutationCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from './api-client';
import { formatApiErrorBody } from './api-error-format';

function formatError(error: unknown): string {
  if (error instanceof ApiError) {
    return formatApiErrorBody(error.status, error.body);
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      gcTime: 1000 * 60 * 5,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && (error.status === 403 || error.status === 401)) {
          return false;
        }
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
    },
  },
  mutationCache: new MutationCache({
    onError: (error) => {
      toast.error(formatError(error));
    },
  }),
});
