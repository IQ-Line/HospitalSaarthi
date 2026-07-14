import { describe, expect, it } from 'vitest';
import { mergePharmacyAssignedStores } from './merge-pharmacy-assigned-stores';

describe('mergePharmacyAssignedStores', () => {
  const inventory = [
    { id: 'primary-id', name: 'OT Store', store_code: 'ST-0003' },
    { id: 'secondary-id', name: 'Central Store', store_code: 'ST-0001' },
    { id: 'other-id', name: 'Other', store_code: 'ST-0009' },
  ];

  it('orders primary first then secondaries and marks isPrimary', () => {
    const result = mergePharmacyAssignedStores(
      {
        primary_store_id: 'primary-id',
        secondary_store_ids: ['secondary-id'],
      },
      inventory,
    );

    expect(result).toEqual([
      { id: 'primary-id', name: 'OT Store', store_code: 'ST-0003', isPrimary: true },
      { id: 'secondary-id', name: 'Central Store', store_code: 'ST-0001', isPrimary: false },
    ]);
  });

  it('skips store ids missing from inventory catalog', () => {
    const result = mergePharmacyAssignedStores(
      {
        primary_store_id: 'missing-id',
        secondary_store_ids: ['secondary-id'],
      },
      inventory,
    );

    expect(result).toEqual([
      { id: 'secondary-id', name: 'Central Store', store_code: 'ST-0001', isPrimary: false },
    ]);
  });
});
