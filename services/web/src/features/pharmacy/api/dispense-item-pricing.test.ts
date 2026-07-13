import { describe, expect, it, vi, afterEach } from 'vitest';
import { apiClient } from '@/lib/api-client';
import { resolveDispenseItemPricing } from './dispense-item-pricing';

vi.mock('@/lib/api-client', () => ({
  apiClient: vi.fn(),
}));

vi.mock('@/features/inventory-masters/lib/inventory-catalog-api-context', () => ({
  inventoryMastersApiContext: () => ({ tenantIdOverride: 'tenant-1' }),
}));

const mockedApiClient = vi.mocked(apiClient);

describe('resolveDispenseItemPricing', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('prefers non-zero list values when pricing API returns zeros', async () => {
    mockedApiClient.mockResolvedValueOnce({
      data: {
        item_id: 'item-1',
        item_code: 'MED-001',
        mrp: '0',
        gst_percent: '0',
      },
    });

    const result = await resolveDispenseItemPricing({
      id: 'item-1',
      tenant_formulary_id: 'form-1',
      item_code: 'MED-001',
      mrp: '99',
      gst_percent: '12',
    });

    expect(result).toEqual({
      item_code: 'MED-001',
      mrp: '99',
      gst_percent: '12',
    });
  });

  it('falls back to list values when pricing API fails', async () => {
    mockedApiClient
      .mockRejectedValueOnce(new Error('404'))
      .mockRejectedValueOnce(new Error('404'));

    const result = await resolveDispenseItemPricing({
      id: 'item-2',
      tenant_formulary_id: 'form-2',
      item_code: 'MED-002',
      mrp: '50',
      gst_percent: '5',
    });

    expect(result).toEqual({
      item_code: 'MED-002',
      mrp: '50',
      gst_percent: '5',
    });
  });
});
