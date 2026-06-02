import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import proxy from '@fastify/http-proxy';
import { loadWorkspaceEnv } from './load-workspace-env.js';

const PORT = Number(process.env['BFF_PORT'] ?? 3000);

interface UpstreamRoute {
  prefix: string;
  upstream: string;
}

function buildUpstreams(): UpstreamRoute[] {
  const userManagementUrl =
    process.env['USER_MANAGEMENT_URL'] ?? 'http://localhost:3005';

  return [
    {
      prefix: '/api/auth',
      upstream: userManagementUrl,
    },
    {
      prefix: '/api/user-management',
      upstream: userManagementUrl,
    },
    {
      prefix: '/api/v1/master-data',
      upstream: process.env['MASTER_DATA_URL'] ?? 'http://localhost:8010',
    },
    {
      prefix: '/api/configurator/v1',
      upstream: process.env['CONFIGURATOR_URL'] ?? 'http://localhost:3001',
    },
    {
      prefix: '/api/empi/v1',
      upstream: process.env['EMPI_URL'] ?? 'http://localhost:3002',
    },
    {
      prefix: '/api/billing/v1',
      upstream: process.env['BILLING_URL'] ?? 'http://localhost:3003',
    },
    {
      prefix: '/api/registration/v1',
      upstream: process.env['REGISTRATION_URL'] ?? 'http://localhost:3006',
    },
    {
      prefix: '/api/v1/opd',
      upstream: process.env['OPD_URL'] ?? 'http://localhost:8020',
    },
  ];
}

const isProduction = process.env['NODE_ENV'] === 'production';

/** Comma-separated exact browser origins, e.g. https://app.example.com */
const productionCorsOrigins = (process.env['CORS_ORIGINS'] ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function isDevBrowserOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  try {
    const { hostname } = new URL(origin);
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.endsWith('.localhost')
    );
  } catch {
    return false;
  }
}

async function main() {
  loadWorkspaceEnv();
  const upstreams = buildUpstreams();
  const app = Fastify({ logger: true });

  await app.register(cors, {
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Cookie',
      'iq_tenant_id',
      'x-tenant-id',
      'Idempotency-Key',
    ],
    origin: (origin, cb) => {
      if (!isProduction) {
        cb(null, isDevBrowserOrigin(origin));
        return;
      }
      if (productionCorsOrigins.length === 0) {
        app.log.warn(
          'CORS_ORIGINS is empty in production — set comma-separated allowed browser origins.',
        );
        cb(null, false);
        return;
      }
      cb(null, !!origin && productionCorsOrigins.includes(origin));
    },
  });

  /**
   * Visits API — single stable path for the browser: `POST /api/v1/visits`.
   * - Default: proxy to `VISITS_SERVICE_URL` (real service when available).
   * - Local UI without backend: run BFF with `VISITS_STUB=true` to return 201 + JSON id.
   */
  const visitsStub = process.env['VISITS_STUB'] === 'true';
  const visitsUpstream =
    process.env['VISITS_SERVICE_URL'] ?? 'http://localhost:8020';
  if (visitsStub) {
    app.post('/api/v1/visits', async (_req, reply) => {
      return reply.code(201).send({ id: randomUUID(), status: 'stub' });
    });
  } else {
    await app.register(proxy, {
      upstream: visitsUpstream,
      prefix: '/api/v1/visits',
      rewritePrefix: '/api/v1/visits',
      http2: false,
    });
  }

  for (const route of upstreams) {
    await app.register(proxy, {
      upstream: route.upstream,
      prefix: route.prefix,
      rewritePrefix: route.prefix,
      http2: false,
      preHandler(request, _reply, done) {
        const forwardedHost = request.headers['x-forwarded-host'];
        const host = request.headers.host;
        if (
          (typeof forwardedHost !== 'string' || forwardedHost.trim().length === 0) &&
          typeof host === 'string' &&
          host.length > 0
        ) {
          request.headers['x-forwarded-host'] = host;
        }
        const proto =
          request.headers['x-forwarded-proto'] ??
          (request.protocol === 'https' ? 'https' : 'http');
        request.headers['x-forwarded-proto'] = proto;
        done();
      },
    });
  }

  app.get('/healthz', async () => ({ status: 'ok' }));

  await app.listen({ port: PORT, host: '0.0.0.0' });
  app.log.info(`BFF listening on http://localhost:${PORT}`);
  const opdUpstream =
    upstreams.find((r) => r.prefix === '/api/v1/opd')?.upstream ??
    'http://localhost:8020';
  app.log.info(`OPD upstream: ${opdUpstream}`);
}

main().catch((err) => {
  console.error('Failed to start BFF:', err);
  process.exit(1);
});
