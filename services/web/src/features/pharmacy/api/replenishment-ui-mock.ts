import {
  DEMO_INDENT_ITEM_CATALOG,
  DEMO_INDENT_REQUESTS,
  DEMO_PHARMACY_STORES,
} from '../data/replenishment-demo-data';
import type {
  IndentItemSearchResult,
  IndentRequestListParams,
  IndentRequestListResponse,
  PharmacyLowStockListParams,
  PharmacyLowStockListResponse,
  PharmacyStoreOption,
} from '../types/replenishment-ui.types';

const MOCK_DELAY_MS = 280;

function delay<T>(value: T, ms = MOCK_DELAY_MS): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), ms);
  });
}

/** Swap for GET /pharmacy/v1/replenishment/low-stock when API is ready. */
export async function fetchPharmacyLowStockMock(
  params: PharmacyLowStockListParams,
): Promise<PharmacyLowStockListResponse> {
  let items = [] as PharmacyLowStockListResponse['items'];

  if (params.q?.trim()) {
    const q = params.q.trim().toLowerCase();
    items = items.filter(
      (row) =>
        row.drug_name.toLowerCase().includes(q) || row.item_code.toLowerCase().includes(q),
    );
  }

  const total = items.length;
  const start = (params.page - 1) * params.page_size;
  const pageItems = items.slice(start, start + params.page_size);

  return delay({
    items: pageItems,
    total,
    page: params.page,
    page_size: params.page_size,
  });
}

/** Swap for GET /pharmacy/v1/replenishment/indents when API is ready. */
export async function fetchIndentRequestsMock(
  params: IndentRequestListParams,
): Promise<IndentRequestListResponse> {
  let items = [...DEMO_INDENT_REQUESTS];

  if (params.status && params.status !== '__all__') {
    items = items.filter((row) => row.status === params.status);
  }
  if (params.q?.trim()) {
    const q = params.q.trim().toLowerCase();
    items = items.filter((row) => row.indent_number.toLowerCase().includes(q));
  }

  const total = items.length;
  const start = (params.page - 1) * params.page_size;
  const pageItems = items.slice(start, start + params.page_size);

  return delay({
    items: pageItems,
    total,
    page: params.page,
    page_size: params.page_size,
  });
}

export async function fetchPharmacyStoresMock(): Promise<PharmacyStoreOption[]> {
  return delay([...DEMO_PHARMACY_STORES]);
}

export async function searchIndentItemsMock(query: string): Promise<IndentItemSearchResult[]> {
  const q = query.trim().toLowerCase();
  if (!q) return delay([]);

  const results = DEMO_INDENT_ITEM_CATALOG.filter(
    (item) =>
      item.name.toLowerCase().includes(q) || item.item_code.toLowerCase().includes(q),
  );
  return delay(results.slice(0, 8));
}

export async function saveIndentDraftMock(): Promise<{ id: string; indent_number: string }> {
  return delay({
    id: `indent-demo-${Date.now()}`,
    indent_number: 'IND-202607-00001',
  });
}
