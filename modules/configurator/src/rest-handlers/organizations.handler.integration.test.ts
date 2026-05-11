import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  createIntegrationDb,
  cleanupIntegrationDb,
  createTestOrganizationData,
  type IntegrationTestDb,
} from '@hims/ts-sdk-testing';
import { DrizzleOrganizationRepo } from '../data-access/organization.repo.js';
import { registerOrganizationsHandler } from './organizations.handler.js';
import { CONFIGURATOR_TEST_SETUP_SQL } from '../schema/test-setup.sql.js';

let testDb: IntegrationTestDb;
let app: FastifyInstance;
let repo: DrizzleOrganizationRepo;

beforeAll(async () => {
  testDb = await createIntegrationDb('configurator', CONFIGURATOR_TEST_SETUP_SQL);
  repo = new DrizzleOrganizationRepo(testDb.db);

  app = Fastify();
  registerOrganizationsHandler(app, repo);
  await app.ready();
});

afterAll(async () => {
  if (app) await app.close();
  if (testDb) await cleanupIntegrationDb(testDb);
});

describe('GET /organizations', () => {
  it('returns 200 with empty data array when no rows exist', async () => {
    const response = await app.inject({ method: 'GET', url: '/organizations' });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { data: unknown[] };
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('returns created organizations in the data array', async () => {
    await repo.create(
      createTestOrganizationData({ name: 'Listed Org', slug: 'listed-org' }),
    );

    const response = await app.inject({ method: 'GET', url: '/organizations' });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { data: Array<{ slug: string }> };
    expect(body.data.some((o) => o.slug === 'listed-org')).toBe(true);
  });

  it('filters by status query param', async () => {
    await repo.create(
      createTestOrganizationData({ slug: 'filtered-suspended', status: 'suspended' }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/organizations?status=suspended',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { data: Array<{ status: string }> };
    expect(body.data.every((o) => o.status === 'suspended')).toBe(true);
  });
});
