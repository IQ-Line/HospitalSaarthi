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
    /* Browser PATCH + JSON + custom headers preflight; allow typical dev URLs (127.0.0.1 vs localhost). */
    origin: (origin, cb) => {
      cb(null, isDevBrowserOrigin(origin));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'iq_tenant_id'],
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
