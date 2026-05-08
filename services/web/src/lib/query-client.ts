import { MutationCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from './api-client';

function formatError(error: unknown): string {
  if (error instanceof ApiError) {
    try {
      const parsed = JSON.parse(error.body);
      return parsed.detail ?? parsed.message ?? `Request failed (${error.status})`;
    } catch {
      return `Request failed (${error.status})`;
    }
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      gcTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
  mutationCache: new MutationCache({
    onError: (error) => {
      toast.error(formatError(error));
    },
  }),
});
