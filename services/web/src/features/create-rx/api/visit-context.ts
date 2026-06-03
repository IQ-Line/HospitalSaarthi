import { getMockCreateRxVisitContext } from '../mock/visit-context.mock';
import { fetchCreateRxVisitContextFromServices } from './build-visit-context';
import type { CreateRxVisitContext } from '../types';

/** Opt-in mock visit context — set `VITE_CREATE_RX_USE_MOCK=true` for UI-only development. */
export function createRxUseMock(): boolean {
  return import.meta.env.VITE_CREATE_RX_USE_MOCK === 'true';
}

export async function fetchCreateRxVisitContext(
  visitId: string,
): Promise<CreateRxVisitContext | null> {
  if (createRxUseMock()) {
    await new Promise((r) => setTimeout(r, 80));
    const mock = getMockCreateRxVisitContext(visitId);
    if (mock) return mock;
  }

  return fetchCreateRxVisitContextFromServices(visitId);
}
