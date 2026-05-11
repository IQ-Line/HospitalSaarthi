import { describe, it, expect, vi } from 'vitest';
import { listOrganizations } from './list-organizations.js';
import type { OrganizationRepo } from '../ports.js';
import type {
  Organization,
  OrganizationFilters,
} from '../domain/organization.types.js';

function createMockOrganization(overrides?: Partial<Organization>): Organization {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Test Hospital',
    slug: 'test-hospital',
    type: 'standalone_hospital',
    status: 'active',
    contact_email: null,
    contact_phone: null,
    address: null,
    metadata: null,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
    created_by: null,
    updated_by: null,
    ...overrides,
  };
}

function createMockRepo(orgs: Organization[]): OrganizationRepo {
  return {
    findAll: vi.fn().mockResolvedValue(orgs),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
}

describe('listOrganizations', () => {
  it('delegates to repo.findAll with no filters', async () => {
    const orgs = [createMockOrganization()];
    const repo = createMockRepo(orgs);

    const result = await listOrganizations(repo);

    expect(result).toEqual(orgs);
    expect(repo.findAll).toHaveBeenCalledWith(undefined);
  });

  it('passes filters through to repo.findAll', async () => {
    const repo = createMockRepo([]);
    const filters: OrganizationFilters = { status: 'active', type: 'hospital_chain' };

    await listOrganizations(repo, filters);

    expect(repo.findAll).toHaveBeenCalledWith(filters);
  });

  it('returns empty array when repo returns no results', async () => {
    const repo = createMockRepo([]);

    const result = await listOrganizations(repo);

    expect(result).toEqual([]);
  });
});
