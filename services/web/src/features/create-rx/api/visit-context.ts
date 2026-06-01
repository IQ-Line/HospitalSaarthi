import { getMockCreateRxVisitContext } from '../mock/visit-context.mock';
import type { CreateRxVisitContext } from '../types';

/** Dev UI without visit context API — set `VITE_CREATE_RX_USE_MOCK=false` when backend is wired. */
export function createRxUseMock(): boolean {
  return (
    import.meta.env.VITE_CREATE_RX_USE_MOCK === 'true' ||
    (import.meta.env.DEV && import.meta.env.VITE_CREATE_RX_USE_MOCK !== 'false')
  );
}

export async function fetchCreateRxVisitContext(
  visitId: string,
): Promise<CreateRxVisitContext | null> {
  if (createRxUseMock()) {
    await new Promise((r) => setTimeout(r, 80));
    return getMockCreateRxVisitContext(visitId);
  }
  throw new Error(
    'Create RX visit context API is not available. Set VITE_CREATE_RX_USE_MOCK=true for development, or wire the visit context endpoint before disabling mock mode.',
  );
}
