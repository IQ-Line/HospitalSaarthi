import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import { registerOpenApiDocs } from '@hims/ts-sdk-openapi';
import { tenantPlugin } from '@hims/ts-sdk-tenant';
import { createRouter, createSmartParchaDeps } from '@hims/smart-parcha';

const PORT = Number(process.env['SMART_PARCHA_SVC_PORT'] ?? 3008);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

async function main() {
  const deps = createSmartParchaDeps(process.env);
  const app = Fastify({ logger: true });

  await app.register(tenantPlugin, {
    required: false,
    headerNames: ['iq_tenant_id', 'x-tenant-id'],
  });

  app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    try {
      const parsed = body ? JSON.parse(body as string) : {};
      done(null, parsed);
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  await app.register(createRouter(deps));

  await registerOpenApiDocs(app, {
    repoRoot,
    serviceId: 'smart-parcha-svc',
    openApiGlob: 'specs/openapi/smart-parcha.v1.yaml',
    mountPath: '/docs',
  });

  app.get('/healthz', async () => ({
    status: 'ok',
    service: 'smart-parcha-svc',
    himsAdapter: deps.config.HIMS_ADAPTER,
  }));

  await app.listen({ port: PORT, host: '0.0.0.0' });
  app.log.info(`smart-parcha-svc listening on http://localhost:${PORT}`);
}

main().catch((err) => {
  console.error('Failed to start smart-parcha-svc:', err);
  process.exit(1);
});
