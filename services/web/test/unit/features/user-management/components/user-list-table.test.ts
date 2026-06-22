import { describe, expect, it } from 'vitest';
import { buildUserListColumns } from '../../../../../src/features/user-management/components/user-list-table';
import type { UmUser } from '../../../../../src/features/user-management/types';

const sampleUser: UmUser = {
  id: '11111111-1111-1111-1111-111111111111',
  full_name: 'Ada Lovelace',
  email: 'ada@example.com',
  username: 'ada',
  status: 'active',
  department: null,
  role_display_names: [],
};

describe('buildUserListColumns', () => {
  it('disables profile links when linkToProfile is false', () => {
    const cols = buildUserListColumns(false, { linkToProfile: false });
    const nameCol = cols.find((c) => 'accessorKey' in c && c.accessorKey === 'full_name');
    expect(nameCol).toBeDefined();
    const cell = nameCol!.cell as (ctx: { row: { original: UmUser } }) => unknown;
    const rendered = cell({ row: { original: sampleUser } });
    expect(rendered).toMatchObject({
      props: { linkToProfile: false, fullName: 'Ada Lovelace' },
    });
  });

  it('passes tenantScope on profile links for tenant-scoped lists', () => {
    const tenantId = '22222222-2222-2222-2222-222222222222';
    const cols = buildUserListColumns(false, { tenantScope: tenantId, linkToProfile: true });
    const nameCol = cols.find((c) => 'accessorKey' in c && c.accessorKey === 'full_name');
    const cell = nameCol!.cell as (ctx: { row: { original: UmUser } }) => unknown;
    const rendered = cell({ row: { original: sampleUser } });
    expect(rendered).toMatchObject({
      props: { tenantScope: tenantId, linkToProfile: true },
    });
  });
});
