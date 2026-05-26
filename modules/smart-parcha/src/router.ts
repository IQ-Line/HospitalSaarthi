import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import type { SmartParchaDeps } from './ports.js';
import { registerSmartParchaRoutes } from './rest-handlers.js';

async function smartParchaPlugin(
  app: FastifyInstance,
  options: SmartParchaDeps,
): Promise<void> {
  await app.register(
    async (api) => {
      await registerSmartParchaRoutes(api, options);
    },
    { prefix: '/api/v1/smart-parcha' },
  );

  await app.register(
    async (legacy) => {
      await registerSmartParchaRoutes(legacy, options);
    },
    { prefix: '/v2' },
  );
}

export function createRouter(deps: SmartParchaDeps) {
  return fp(
    async (app: FastifyInstance) => smartParchaPlugin(app, deps),
    { fastify: '5.x', name: '@hims/smart-parcha' },
  );
}
