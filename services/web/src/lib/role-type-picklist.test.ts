import { describe, expect, it } from 'vitest';
import type { PicklistValue } from '@/features/master-data/types';
import { filterRoleTypePicklistForPrincipal } from './role-type-picklist';

function row(
  value: string,
  is_global: boolean,
): PicklistValue {
  return {
    id: value,
    category_id: 'cat',
    value,
    label: value,
    description: null,
    is_active: true,
    is_global,
    display_order: 0,
    created_at: '',
    updated_at: '',
  };
}

const ALL = [
  row('doctor', false),
  row('super-admin', true),
  row('tenant-admin', true),
];

describe('filterRoleTypePicklistForPrincipal', () => {
  it('returns only global types for platform super-admin', () => {
    const filtered = filterRoleTypePicklistForPrincipal(ALL, { isPlatformSuperAdmin: true });
    expect(filtered.map((r) => r.value)).toEqual(['super-admin', 'tenant-admin']);
  });

  it('returns only tenant staff types for tenant-admin and other users', () => {
    const filtered = filterRoleTypePicklistForPrincipal(ALL, { isPlatformSuperAdmin: false });
    expect(filtered.map((r) => r.value)).toEqual(['doctor']);
  });
});
