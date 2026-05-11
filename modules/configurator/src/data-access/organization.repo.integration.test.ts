import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createIntegrationDb,
  cleanupIntegrationDb,
  createTestOrganizationData,
  type IntegrationTestDb,
} from '@hims/ts-sdk-testing';
import { DrizzleOrganizationRepo } from './organization.repo.js';
import { CONFIGURATOR_TEST_SETUP_SQL } from '../schema/test-setup.sql.js';

let testDb: IntegrationTestDb;
let repo: DrizzleOrganizationRepo;

beforeAll(async () => {
  testDb = await createIntegrationDb('configurator', CONFIGURATOR_TEST_SETUP_SQL);
  repo = new DrizzleOrganizationRepo(testDb.db);
});

afterAll(async () => {
  if (testDb) await cleanupIntegrationDb(testDb);
});

describe('DrizzleOrganizationRepo', () => {
  it('creates an organization and returns the row with defaults applied', async () => {
    const created = await repo.create(
      createTestOrganizationData({ name: 'Apollo Hospitals', slug: 'apollo' }),
    );

    expect(created.id).toBeDefined();
    expect(created.name).toBe('Apollo Hospitals');
    expect(created.slug).toBe('apollo');
    expect(created.status).toBe('active');
    expect(created.created_at).toBeInstanceOf(Date);
  });

  it('findById returns the created row', async () => {
    const created = await repo.create(
      createTestOrganizationData({ slug: 'find-by-id-org' }),
    );

    const found = await repo.findById(created.id);

    expect(found).toBeDefined();
    expect(found!.id).toBe(created.id);
  });

  it('findById returns undefined for a missing id', async () => {
    const missing = await repo.findById('00000000-0000-0000-0000-000000000000');
    expect(missing).toBeUndefined();
  });

  it('findAll filters by status', async () => {
    await repo.create(
      createTestOrganizationData({ slug: 'active-org-1', status: 'active' }),
    );
    await repo.create(
      createTestOrganizationData({ slug: 'suspended-org', status: 'suspended' }),
    );

    const active = await repo.findAll({ status: 'active' });
    expect(active.length).toBeGreaterThan(0);
    expect(active.every((o) => o.status === 'active')).toBe(true);
  });

  it('update changes the row and returns the updated values', async () => {
    const created = await repo.create(
      createTestOrganizationData({ name: 'Original Name', slug: 'update-target' }),
    );

    const updated = await repo.update(created.id, { name: 'New Name' });

    expect(updated).toBeDefined();
    expect(updated!.name).toBe('New Name');
  });
});
