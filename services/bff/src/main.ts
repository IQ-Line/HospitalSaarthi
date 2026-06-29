import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import proxy from '@fastify/http-proxy';
import {
  identityPlugin,
  validateAuthConfig,
  type Principal,
} from '@hims/ts-sdk-identity';
import { loadWorkspaceEnv } from './load-workspace-env.js';

const PORT = Number(process.env['BFF_PORT'] ?? 3000);

interface UpstreamRoute {
  prefix: string;
  upstream: string;
}

function buildUpstreams(): UpstreamRoute[] {
  const userManagementUrl =
    process.env['USER_MANAGEMENT_URL'] ?? 'http://localhost:3005';
  const integrationHubUrl =
    process.env['INTEGRATION_HUB_URL'] ??
    'http://localhost:3007';

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
    {
      prefix: '/api/pharmacy/v1',
      upstream: process.env['PHARMACY_URL'] ?? 'http://localhost:3004',
    },
    {
      prefix: '/api/abdm/v1',
      upstream: integrationHubUrl,
    },
    {
      prefix: '/api/v3',
      upstream: integrationHubUrl,
    },
  ];
}

/**
 * Browser-facing path prefixes that legitimately carry NO user JWT and so bypass
 * edge verification. Each is authenticated by a *different* mechanism downstream —
 * mirroring each upstream service's own `skipPathPrefixes`:
 *   - `/api/auth`                          better-auth credential/login + JWKS (you are logging in)
 *   - `/api/v3`                            inbound ABDM gateway callbacks (ABDM signature-secured,
 *                                          mounted OUTSIDE integration-hub's identity plugin)
 *   - `/api/public`                        the BFF's own public utilities (e.g. pincode lookup)
 *   - `/api/user-management/auth/api-key`  tenant API-key flow (UM exempts it from JWT too)
 * `/healthz`, `/readyz`, `/livez` are skipped by the identity plugin itself.
 */
const EDGE_AUTH_SKIP_PREFIXES = [
  '/api/auth',
  '/api/v3',
  '/api/public',
  '/api/user-management/auth/api-key',
];

/**
 * Make user identity authoritative at the edge: strip every client-supplied identity
 * alias, then set `x-user-id` from the VERIFIED token subject. Result: identity
 * headers are present iff the request is authenticated and always equal the verified
 * subject — no alias can carry a spoofed id. Backends (notably the Python OPD /
 * master-data services) trust these headers without re-checking them against the
 * bearer token, so this is the control that closes the impersonation gap. On public
 * (skipped) routes there is no verified identity, so all identity aliases are stripped.
 *
 * SCOPE — TENANT IS NOT ENFORCED HERE (honest gate, NOT a downstream control that
 * exists today): the tenant headers (`iq_tenant_id`, `x-tenant-id`) are passed
 * through UNCHANGED. Edge auth does not decide tenant scope. Two reasons it is left
 * to a later, dedicated pass rather than pinned to the token's tenant here:
 *   1. A super-admin legitimately acts across tenants; deciding whether a principal
 *      MAY act on the requested tenant needs capability/role context that the base
 *      access token does not carry — i.e. an AUTHORIZATION decision (authz phase / D10),
 *      not something the gateway can do correctly from the JWT alone.
 *   2. Inbound ABDM callbacks (`/api/v3`) resolve their tenant FROM `x-tenant-id` /
 *      `X-HIP-ID` (modules/integration-hub/.../lib/resolve-callback-tenant.ts), so the
 *      tenant headers must NOT be stripped on public routes either.
 * KNOWN GAP (pre-existing, owned pre-prod gate): the Python OPD/master-data services
 * use `iq_tenant_id` from the header as the data scope with NO PDP — an empi-class
 * cross-tenant gap. Until those modules derive/enforce tenant scope from the verified
 * principal (the fix empi already shipped), an authenticated user can target another
 * tenant on those paths. The app has not gone live; close before multi-tenant prod.
 */
function normalizeIdentityHeaders(request: FastifyRequest): void {
  const userId = (request.user as Principal | undefined)?.userId;
  // Strip every client-supplied identity alias the backends accept (OPD reads both
  // `x-user-id` and `iq_user_id` — principal.py), then set the canonical one from the
  // verified token. Hardening only `x-user-id` would leave `iq_user_id` spoofable.
  delete request.headers['x-user-id'];
  delete request.headers['iq_user_id'];
  if (typeof userId === 'string' && userId.length > 0) {
    request.headers['x-user-id'] = userId;
  }
}

function warnEdgeAuthDisabled(app: FastifyInstance, isProduction: boolean): void {
  const message =
    'ENABLE_AUTH is not "true" — the BFF is a passthrough proxy with NO JWT validation, ' +
    'NO identity hardening, and NO ban cutoff. Clients can spoof x-user-id. ' +
    'Set ENABLE_AUTH=true plus JWT_ISSUER, JWT_AUDIENCE, JWKS_URL before staging/production.';
  if (isProduction) {
    app.log.error(message);
  } else {
    app.log.warn(message);
  }
}

/** Comma-separated exact browser origins, e.g. https://app.example.com */
function productionCorsOrigins(): string[] {
  return (process.env['CORS_ORIGINS'] ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

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

/**
 * Builds the BFF Fastify instance WITHOUT listening — so tests can drive it via
 * `app.inject()`. All configuration is read from `process.env` at call time.
 * `main()` calls this and then `app.listen()`.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const isProduction = process.env['NODE_ENV'] === 'production';
  const enableAuth = process.env['ENABLE_AUTH'] === 'true';
  const upstreams = buildUpstreams();
  const corsOrigins = productionCorsOrigins();
  const app = Fastify({ logger: { level: process.env['LOG_LEVEL'] ?? 'info' } });

  await app.register(cors, {
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Cookie',
      'iq_tenant_id',
      'x-tenant-id',
      'x-user-id',
      'Idempotency-Key',
      'x-bypass-entitlement-cache',
      'x-api-key',
    ],
    origin: (origin, cb) => {
      if (!isProduction) {
        cb(null, isDevBrowserOrigin(origin));
        return;
      }
      if (corsOrigins.length === 0) {
        app.log.warn(
          'CORS_ORIGINS is empty in production — set comma-separated allowed browser origins.',
        );
        cb(null, false);
        return;
      }
      cb(null, !!origin && corsOrigins.includes(origin));
    },
  });

  // Edge authentication: validate the bearer JWT once at the gateway (JWKS, RS256,
  // issuer/audience) and derive authoritative identity headers for the polyglot
  // backends. Public prefixes (login, ABDM callbacks, public utilities) bypass it.
  if (enableAuth) {
    const auth = validateAuthConfig();
    await app.register(identityPlugin, {
      ...auth,
      skipPathPrefixes: EDGE_AUTH_SKIP_PREFIXES,
    });
    // Runs after the identity plugin's onRequest hook (registration order), so
    // `request.user` is populated for authenticated routes by the time it fires.
    app.addHook('onRequest', async (request) => {
      normalizeIdentityHeaders(request);
    });
    app.log.info(
      'Edge auth ENABLED — per-request JWT validation + authoritative x-user-id.',
    );
  } else {
    warnEdgeAuthDisabled(app, isProduction);
  }

  /**
   * Visits API — single stable path for the browser: `POST /api/v1/visits`.
   * - Default: proxy to `VISITS_SERVICE_URL` (real service when available).
   * - Local UI without backend: run BFF with `VISITS_STUB=true` to return 201 + JSON id.
   */
  const visitsStub = process.env['VISITS_STUB'] === 'true';
  const visitsUpstream =
    process.env['OPD_URL'] ?? 'http://localhost:8020';
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

  app.get('/api/public/postal/pincode/:pincode', async (request, reply) => {
    const pincode = (request.params as { pincode?: string }).pincode?.trim() ?? '';
    if (!/^\d{6}$/.test(pincode)) {
      return reply.code(400).send({ error: 'PIN code must be 6 digits' });
    }

    try {
      const upstream = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
        headers: { Accept: 'application/json' },
      });
      const body = await upstream.text();
      return reply.code(upstream.status).type('application/json').send(body);
    } catch (err) {
      request.log.error({ err, pincode }, 'Postal pincode lookup failed');
      return reply.code(502).send({ error: 'Postal pincode lookup failed' });
    }
  });

  const opdUpstream =
    upstreams.find((r) => r.prefix === '/api/v1/opd')?.upstream ??
    'http://localhost:8020';
  const integrationHubUpstream =
    upstreams.find((r) => r.prefix === '/api/abdm/v1')?.upstream ??
    'http://localhost:3007';
  app.log.info(`OPD upstream: ${opdUpstream}`);
  app.log.info(`Integration hub upstream: ${integrationHubUpstream}`);

  return app;
}

/**
 * Refuse to boot a production BFF without edge auth — the one guardrail against
 * shipping the gateway as an open passthrough. Exported for direct unit testing
 * (it lives in the boot path, outside buildApp/inject reach).
 */
export function assertProductionAuthConfigured(
  isProduction: boolean,
  enableAuth: boolean,
): void {
  if (isProduction && !enableAuth) {
    throw new Error(
      'ENABLE_AUTH=true is required when NODE_ENV=production (BFF edge authentication).',
    );
  }
}

async function main() {
  loadWorkspaceEnv();
  assertProductionAuthConfigured(
    process.env['NODE_ENV'] === 'production',
    process.env['ENABLE_AUTH'] === 'true',
  );

  const app = await buildApp();
  await app.listen({ port: PORT, host: '0.0.0.0' });
  app.log.info(`BFF listening on http://localhost:${PORT}`);
}

// Auto-start only when this module is the process entry point — not when a test
// imports `buildApp`. `pathToFileURL` is the canonical, encoding-safe comparison.
const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  main().catch((err) => {
    console.error('Failed to start BFF:', err);
    process.exit(1);
  });
}
