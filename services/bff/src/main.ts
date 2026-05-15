import Fastify from 'fastify';
import cors from '@fastify/cors';
import proxy from '@fastify/http-proxy';

const PORT = Number(process.env['BFF_PORT'] ?? 3000);

interface UpstreamRoute {
  prefix: string;
  upstream: string;
}

const upstreams: UpstreamRoute[] = [
  {
    prefix: '/api/v1/master-data',
    upstream: process.env['MASTER_DATA_URL'] ?? 'http://localhost:8010',
  },
  {
    prefix: '/api/configurator/v1',
    upstream: process.env['CONFIGURATOR_URL'] ?? 'http://localhost:3001',
  },
  // Add new module upstreams here as they come online:
  // { prefix: '/api/v1/user-management', upstream: process.env['USER_MANAGEMENT_URL'] ?? 'http://localhost:3002' },
  // { prefix: '/api/v1/empi', upstream: process.env['EMPI_URL'] ?? 'http://localhost:3003' },
];

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
  const app = Fastify({ logger: true });

  await app.register(cors, {
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'iq_tenant_id',
      'x-tenant-id',
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

  for (const route of upstreams) {
    await app.register(proxy, {
      upstream: route.upstream,
      prefix: route.prefix,
      rewritePrefix: route.prefix,
      http2: false,
    });
  }

  app.get('/healthz', async () => ({ status: 'ok' }));

  await app.listen({ port: PORT, host: '0.0.0.0' });
}

main().catch((err) => {
  console.error('Failed to start BFF:', err);
  process.exit(1);
});
