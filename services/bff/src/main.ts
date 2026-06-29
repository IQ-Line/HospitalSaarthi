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
import { forbidden } from '@hims/ts-sdk-http';
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

const PLATFORM_SUPER_ADMIN_ROLE = 'super-admin';

/**
 * Platform super-admins legitimately act ACROSS tenants (e.g. provisioning a new
 * tenant's catalog). Same predicate as the canonical in-house definitions in
 * modules/user-management/src/http/resolve-effective-tenant-id.ts
 * (`isPlatformSuperAdminRole`) and services/web/src/lib/platform-admin.ts. The role
 * string is duplicated in both; no shared home is adopted yet — the natural one is
 * `@hims/ts-sdk-identity` (already a BFF dependency), deferred to keep this slice
 * edge-only. At the edge only the verified JWT `roles` claim exists (the Cerbos
 * `role_codes` enrichment is downstream-only), which is exactly the input this needs.
 * The `.trim().toLowerCase()` mirrors the SDK's own role normalization (verify.ts)
 * and the two precedent copies — self-contained, so the check doesn't silently depend
 * on an undocumented upstream invariant. Exported for direct unit testing.
 *
 * GATE (load-bearing, NOT enforced today — see follow-up): this whole cross-tenant
 * exception assumes `super-admin` is a platform-reserved role code a tenant CANNOT
 * self-assign. UM has no such reservation yet; a tenant minting a role that normalizes
 * to `super-admin` would gain cross-tenant bypass platform-wide (here, in UM, and in
 * configurator — all use this same string match). Must be enforced before multi-tenant
 * go-live.
 */
export function isPlatformSuperAdmin(roles: readonly string[]): boolean {
  return roles.some(
    (role) => role.trim().toLowerCase() === PLATFORM_SUPER_ADMIN_ROLE,
  );
}

/** A Fastify header value: proxies may send `string[]`, and it may be absent. */
type RawHeaderValue = string | string[] | undefined;

function asSingleHeaderValue(value: RawHeaderValue): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * The tenant the downstream services resolve to: `iq_tenant_id` preferred,
 * `x-tenant-id` fallback — the SAME precedence OPD (`iq_tenant_id or x_tenant_id`,
 * modules/opd/src/opd/core/tenant.py) and master-data (catalog_tenant_id.py) use, so
 * the value asserted here is exactly the value they will scope their queries by.
 * INVARIANT this relies on: every tenant-consuming downstream resolves iq-before-x.
 */
function pickHeaderTenant(request: FastifyRequest): string | undefined {
  return (
    asSingleHeaderValue(request.headers['iq_tenant_id'] as RawHeaderValue) ??
    asSingleHeaderValue(request.headers['x-tenant-id'] as RawHeaderValue)
  );
}

/**
 * Edge tenant-scope assertion — mirrors user-management's
 * `assertTenantHeaderAllowedForPrincipal`: a request may only carry the tenant scope
 * of the VERIFIED principal, EXCEPT platform super-admins (who may scope cross-tenant).
 * An ABSENT tenant header is allowed — it means "global" for master-data's
 * `master_global` catalog, and identity-only routes carry none.
 *
 * For requests routed through this gateway, this is the control that closes the
 * cross-tenant data gap for the polyglot backends: the Python OPD/master-data services
 * use the tenant header as the data scope with NO PDP of their own, so without this an
 * authenticated user could read another tenant's data by changing the header.
 *
 * Returns true for public/skipped routes — there is no verified principal, hence no
 * tenant to pin (e.g. `/api/v3` ABDM callbacks resolve their own tenant downstream).
 */
function checkTenantScope(request: FastifyRequest): boolean {
  const principal = request.user as Principal | undefined;
  if (!principal) return true;
  const headerTenant = pickHeaderTenant(request);
  if (headerTenant === undefined || headerTenant === principal.tenantId) {
    return true;
  }
  return isPlatformSuperAdmin(principal.roles);
}

/**
 * After {@link checkTenantScope} ALLOWS an authenticated request, collapse BOTH tenant
 * headers to the single validated value (or remove both when absent). Passing the
 * client's headers through unchanged is unsafe: a request allowed because `iq_tenant_id`
 * matches the principal can still carry a CONFLICTING `x-tenant-id`, and a proxy hop
 * that drops the underscore header (nginx does this by default — see the note in
 * master-data's catalog_tenant_id.py) would leave only `x-tenant-id`, letting the
 * downstream resolve a DIFFERENT tenant. Canonicalizing kills that fallback, exactly as
 * {@link normalizeIdentityHeaders} does for the `x-user-id`/`iq_user_id` alias pair.
 * Absent stays absent (master-data `master_global`). Public routes (no principal) are
 * left untouched — `/api/v3` ABDM callbacks resolve their own tenant from `x-tenant-id`.
 */
function canonicalizeTenantHeaders(request: FastifyRequest): void {
  const principal = request.user as Principal | undefined;
  if (!principal) return;
  const effectiveTenant = pickHeaderTenant(request);
  delete request.headers['iq_tenant_id'];
  delete request.headers['x-tenant-id'];
  if (effectiveTenant !== undefined) {
    request.headers['iq_tenant_id'] = effectiveTenant;
    request.headers['x-tenant-id'] = effectiveTenant;
  }
}

/**
 * Make user identity authoritative at the edge: strip every client-supplied identity
 * alias, then set `x-user-id` from the VERIFIED token subject. Result: identity
 * headers are present iff the request is authenticated and always equal the verified
 * subject — no alias can carry a spoofed id. Backends (notably the Python OPD /
 * master-data services) trust these headers without re-checking them against the
 * bearer token, so this is the control that closes the impersonation gap. On public
 * (skipped) routes there is no verified identity, so all identity aliases are stripped.
 *
 * Tenant scope is handled separately by {@link checkTenantScope} (assert) and
 * {@link canonicalizeTenantHeaders} (collapse the tenant headers to the validated
 * value), both run before this in the onRequest hook. Residual gap (owned pre-prod
 * gate): direct-to-service network access that bypasses this gateway — the Python
 * services still have no JWT/PDP of their own (a deployment network-policy concern +
 * the py-sdk-authz initiative).
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
    app.addHook('onRequest', async (request, reply) => {
      // Tenant scope FIRST: reject a request whose tenant header doesn't match the
      // verified principal (super-admins excepted), then collapse the tenant headers to
      // the validated value so no conflicting fallback can leak downstream.
      if (!checkTenantScope(request)) {
        return forbidden(
          reply,
          request,
          'TENANT_SCOPE_FORBIDDEN',
          'Requested tenant scope is not permitted for the authenticated principal.',
        );
      }
      canonicalizeTenantHeaders(request);
      normalizeIdentityHeaders(request);
    });
    app.log.info(
      'Edge auth ENABLED — JWT validation + authoritative x-user-id + tenant-scope assertion.',
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
