import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';
import type { FastifyInstance } from 'fastify';
import { clearJwksCache } from '@hims/ts-sdk-identity';
import { assertProductionAuthConfigured, buildApp } from '../../src/main.js';

/**
 * Sincere edge-auth test: a REAL RS256 keypair, a REAL JWKS endpoint over HTTP, REAL
 * jose-minted tokens, and a REAL upstream "recorder" the BFF proxies to. The BFF is
 * driven via `app.inject()`; the proxy then makes a genuine outbound call to the
 * recorder. So "blocked" is proven by the recorder NEVER being hit (401, no proxy),
 * and "identity hardened" is proven by the headers the recorder ECHOES BACK in its
 * response body — which `inject` awaits, so the assertion is causally tied to this
 * request's proxied round-trip (no reliance on shared cross-test state).
 */

const AUDIENCE = 'hims-platform';
const TENANT_A = '11111111-1111-1111-1111-111111111111';
const TENANT_B = '99999999-9999-9999-9999-999999999999';
const USER_A = '22222222-2222-2222-2222-222222222222';
const KID = 'test-key-1';

let keyPair: Awaited<ReturnType<typeof generateKeyPair>>;
let jwksServer: Server;
let upstream: Server;
let issuer: string;

interface RecordedRequest {
  url: string;
  headers: IncomingHttpHeaders;
}
let received: RecordedRequest[] = [];

function listen(server: Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      resolve((server.address() as AddressInfo).port);
    });
  });
}

function close(server: Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

async function mintToken(
  opts: {
    sub?: string;
    iss?: string;
    aud?: string;
    iatOffsetSeconds?: number;
    expOffsetSeconds?: number;
    omitTenant?: boolean;
    roles?: string[];
    scopes?: string[];
  } = {},
): Promise<string> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload: Record<string, unknown> = {
    jti: randomUUID(),
    roles: opts.roles ?? ['doctor'],
  };
  if (opts.scopes !== undefined) {
    payload['scopes'] = opts.scopes;
  }
  if (!opts.omitTenant) {
    payload['iq_tenant_id'] = TENANT_A;
  }
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256', kid: KID })
    .setSubject(opts.sub ?? USER_A)
    .setIssuer(opts.iss ?? issuer)
    .setAudience(opts.aud ?? AUDIENCE)
    .setIssuedAt(nowSeconds + (opts.iatOffsetSeconds ?? 0))
    .setExpirationTime(nowSeconds + (opts.expOffsetSeconds ?? 120))
    .sign(keyPair.privateKey);
}

/** Headers the upstream recorder actually received, read from its echoed response body. */
function echoedHeaders(res: { json(): unknown }): IncomingHttpHeaders {
  return (res.json() as { headers: IncomingHttpHeaders }).headers;
}

beforeAll(async () => {
  keyPair = await generateKeyPair('RS256');
  const publicJwk = { ...(await exportJWK(keyPair.publicKey)), kid: KID, alg: 'RS256', use: 'sig' };

  jwksServer = createServer((req, res) => {
    if (req.url === '/api/auth/.well-known/jwks.json') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ keys: [publicJwk] }));
      return;
    }
    res.writeHead(404);
    res.end();
  });
  const jwksPort = await listen(jwksServer);
  issuer = `http://127.0.0.1:${jwksPort}`;

  // The recorder records each request AND echoes the headers it saw back in the body,
  // so positive assertions read the proxied round-trip's own result, not shared state.
  upstream = createServer((req, res) => {
    received.push({ url: req.url ?? '', headers: req.headers });
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, headers: req.headers }));
  });
  const upstreamPort = await listen(upstream);
  const upstreamUrl = `http://127.0.0.1:${upstreamPort}`;

  process.env['LOG_LEVEL'] = 'silent';
  process.env['NODE_ENV'] = 'test';
  process.env['JWT_ISSUER'] = issuer;
  process.env['JWKS_URL'] = `${issuer}/api/auth/.well-known/jwks.json`;
  process.env['JWT_AUDIENCE'] = AUDIENCE;
  process.env['USER_MANAGEMENT_URL'] = upstreamUrl;
  process.env['INTEGRATION_HUB_URL'] = upstreamUrl;
  process.env['OPD_URL'] = upstreamUrl;
});

afterAll(async () => {
  await close(jwksServer);
  await close(upstream);
});

beforeEach(() => {
  received = [];
  clearJwksCache();
});

describe('BFF edge auth (ENABLE_AUTH=true)', () => {
  let app: FastifyInstance;

  beforeEach(() => {
    process.env['ENABLE_AUTH'] = 'true';
  });

  afterEach(async () => {
    if (app) await app.close();
  });

  it('rejects a protected route with no bearer token — 401, upstream never hit', async () => {
    app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/opd/prescriptions' });
    expect(res.statusCode).toBe(401);
    expect(received).toHaveLength(0);
  });

  it('protects the browser ABHA wizard (/api/abdm/v1) — 401 without a token', async () => {
    app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/abdm/v1/profile' });
    expect(res.statusCode).toBe(401);
    expect(received).toHaveLength(0);
  });

  it('passes a valid token through and forces x-user-id to the verified subject', async () => {
    app = await buildApp();
    const token = await mintToken();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/opd/prescriptions',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(received).toHaveLength(1);
    expect(echoedHeaders(res)['x-user-id']).toBe(USER_A);
  });

  it('overwrites a spoofed x-user-id with the verified subject (closes the OPD trust gap)', async () => {
    app = await buildApp();
    const token = await mintToken({ sub: USER_A });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/opd/prescriptions',
      headers: { authorization: `Bearer ${token}`, 'x-user-id': 'attacker-supplied-id' },
    });
    expect(res.statusCode).toBe(200);
    const echoed = echoedHeaders(res);
    expect(echoed['x-user-id']).toBe(USER_A);
    expect(echoed['x-user-id']).not.toBe('attacker-supplied-id');
  });

  it('strips the spoofable iq_user_id alias and re-asserts the verified subject', async () => {
    app = await buildApp();
    const token = await mintToken({ sub: USER_A });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/opd/prescriptions',
      headers: { authorization: `Bearer ${token}`, 'iq_user_id': 'attacker-supplied-id' },
    });
    expect(res.statusCode).toBe(200);
    const echoed = echoedHeaders(res);
    expect(echoed['iq_user_id']).toBeUndefined();
    expect(echoed['x-user-id']).toBe(USER_A);
  });

  it('allows a tenant header that matches the verified token tenant — 200, both headers canonicalized', async () => {
    app = await buildApp();
    const token = await mintToken(); // doctor in TENANT_A
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/opd/prescriptions',
      headers: { authorization: `Bearer ${token}`, 'iq_tenant_id': TENANT_A },
    });
    expect(res.statusCode).toBe(200);
    expect(received).toHaveLength(1);
    const echoed = echoedHeaders(res);
    expect(echoed['iq_tenant_id']).toBe(TENANT_A);
    // canonicalization re-sets x-tenant-id from the validated value even though only
    // iq_tenant_id was sent — both headers always agree downstream.
    expect(echoed['x-tenant-id']).toBe(TENANT_A);
  });

  it('allows an ABSENT tenant header — 200, BOTH tenant headers absent downstream (master-data global)', async () => {
    app = await buildApp();
    const token = await mintToken();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/opd/prescriptions',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(received).toHaveLength(1);
    const echoed = echoedHeaders(res);
    expect(echoed['iq_tenant_id']).toBeUndefined();
    expect(echoed['x-tenant-id']).toBeUndefined();
  });

  it('treats an empty-string tenant header as absent — 200 (global), not a 403', async () => {
    app = await buildApp();
    const token = await mintToken();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/opd/prescriptions',
      headers: { authorization: `Bearer ${token}`, 'iq_tenant_id': '' },
    });
    expect(res.statusCode).toBe(200);
    expect(received).toHaveLength(1);
    expect(echoedHeaders(res)['iq_tenant_id']).toBeUndefined();
  });

  it('rejects a tenant header that differs from the verified token — 403, upstream never hit', async () => {
    app = await buildApp();
    const token = await mintToken(); // doctor in TENANT_A
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/opd/prescriptions',
      headers: { authorization: `Bearer ${token}`, 'iq_tenant_id': TENANT_B },
    });
    expect(res.statusCode).toBe(403);
    expect(received).toHaveLength(0);
    expect(res.json().code).toBe('TENANT_SCOPE_FORBIDDEN');
  });

  it('rejects a cross-tenant scope set via the x-tenant-id fallback header — 403', async () => {
    app = await buildApp();
    const token = await mintToken(); // doctor in TENANT_A
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/opd/prescriptions',
      headers: { authorization: `Bearer ${token}`, 'x-tenant-id': TENANT_B },
    });
    expect(res.statusCode).toBe(403);
    expect(received).toHaveLength(0);
  });

  it('rejects when the iq_tenant_id precedence-winner is foreign, even if x-tenant-id is own — 403', async () => {
    // Downstream resolves iq before x, so iq=TENANT_B is what they would scope by.
    app = await buildApp();
    const token = await mintToken(); // doctor in TENANT_A
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/opd/prescriptions',
      headers: {
        authorization: `Bearer ${token}`,
        'iq_tenant_id': TENANT_B,
        'x-tenant-id': TENANT_A,
      },
    });
    expect(res.statusCode).toBe(403);
    expect(received).toHaveLength(0);
  });

  it('canonicalizes a conflicting x-tenant-id to the verified tenant (no leak via the fallback header)', async () => {
    // iq matches the token (allowed), but a stray x-tenant-id points at TENANT_B. If a
    // proxy dropped the underscore header in transit, downstream would resolve x-tenant-id
    // = TENANT_B → cross-tenant read. The edge must collapse BOTH headers to TENANT_A.
    app = await buildApp();
    const token = await mintToken(); // TENANT_A
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/opd/prescriptions',
      headers: {
        authorization: `Bearer ${token}`,
        'iq_tenant_id': TENANT_A,
        'x-tenant-id': TENANT_B,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(received).toHaveLength(1);
    const echoed = echoedHeaders(res);
    expect(echoed['iq_tenant_id']).toBe(TENANT_A);
    expect(echoed['x-tenant-id']).toBe(TENANT_A); // stray TENANT_B neutralized
  });

  it('lets a bounded platform operator (scope:platform) scope cross-tenant — 200, both headers collapsed to the chosen tenant', async () => {
    app = await buildApp();
    const token = await mintToken({ scopes: ['platform'] });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/opd/prescriptions',
      headers: { authorization: `Bearer ${token}`, 'iq_tenant_id': TENANT_B },
    });
    expect(res.statusCode).toBe(200);
    expect(received).toHaveLength(1);
    const echoed = echoedHeaders(res);
    expect(echoed['iq_tenant_id']).toBe(TENANT_B);
    expect(echoed['x-tenant-id']).toBe(TENANT_B);
  });

  it('does not assert tenant scope on public routes — /api/v3 callbacks keep their own tenant header', async () => {
    app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v3/hip/token/on-generate-token',
      headers: { 'iq_tenant_id': TENANT_B },
      payload: { ack: true },
    });
    expect(res.statusCode).toBe(200);
    expect(received).toHaveLength(1);
    expect(echoedHeaders(res)['iq_tenant_id']).toBe(TENANT_B);
  });

  it('rejects an expired token — 401, upstream never hit', async () => {
    app = await buildApp();
    // iat 120s ago (within the 300s max age) but exp 90s ago — past the 60s clock-skew
    // tolerance → isolates the expiry check (not the max-token-age check).
    const token = await mintToken({ iatOffsetSeconds: -120, expOffsetSeconds: -90 });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/opd/prescriptions',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(401);
    expect(received).toHaveLength(0);
  });

  it('rejects a token from an unrecognized issuer — 401', async () => {
    app = await buildApp();
    const token = await mintToken({ iss: 'http://evil.example.test' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/opd/prescriptions',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(401);
    expect(received).toHaveLength(0);
  });

  it('rejects a token with the wrong audience — 401', async () => {
    app = await buildApp();
    const token = await mintToken({ aud: 'some-other-audience' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/opd/prescriptions',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(401);
    expect(received).toHaveLength(0);
  });

  it('rejects a token missing the required iq_tenant_id claim — 401', async () => {
    app = await buildApp();
    const token = await mintToken({ omitTenant: true });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/opd/prescriptions',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(401);
    expect(received).toHaveLength(0);
  });

  it('rejects a malformed/garbage bearer token — 401, upstream never hit', async () => {
    app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/opd/prescriptions',
      headers: { authorization: 'Bearer not-a-real-jwt' },
    });
    expect(res.statusCode).toBe(401);
    expect(received).toHaveLength(0);
  });

  it('lets inbound ABDM gateway callbacks (/api/v3) through WITHOUT a user JWT', async () => {
    app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v3/hip/token/on-generate-token',
      payload: { ack: true },
    });
    expect(res.statusCode).toBe(200);
    expect(received).toHaveLength(1);
    // No verified identity on a public route → no x-user-id injected.
    expect(echoedHeaders(res)['x-user-id']).toBeUndefined();
  });

  it('lets /api/auth through without a token AND strips inbound spoofed identity aliases', async () => {
    app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/username',
      headers: { 'x-user-id': 'attacker-supplied-id', 'iq_user_id': 'attacker-supplied-id' },
      payload: { probe: true },
    });
    expect(res.statusCode).toBe(200);
    expect(received).toHaveLength(1);
    const echoed = echoedHeaders(res);
    expect(echoed['x-user-id']).toBeUndefined();
    expect(echoed['iq_user_id']).toBeUndefined();
  });

  it('serves /healthz without a token', async () => {
    app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/healthz' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });
});

describe('BFF passthrough (ENABLE_AUTH not "true")', () => {
  let app: FastifyInstance;
  const prevEnableAuth = process.env['ENABLE_AUTH'];

  afterEach(async () => {
    if (app) await app.close();
    process.env['ENABLE_AUTH'] = prevEnableAuth;
  });

  it('does NOT gate requests when auth is disabled (current dev behavior preserved)', async () => {
    process.env['ENABLE_AUTH'] = 'false';
    app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/opd/prescriptions' });
    expect(res.statusCode).toBe(200);
    expect(received).toHaveLength(1);
  });

  it('does NOT assert tenant scope when auth is disabled', async () => {
    process.env['ENABLE_AUTH'] = 'false';
    app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/opd/prescriptions',
      headers: { 'iq_tenant_id': TENANT_B },
    });
    expect(res.statusCode).toBe(200);
    expect(received).toHaveLength(1);
  });
});

describe('assertProductionAuthConfigured (boot guard)', () => {
  it('throws when production has auth disabled', () => {
    expect(() => assertProductionAuthConfigured(true, false)).toThrow(/ENABLE_AUTH=true is required/);
  });

  it('allows production with auth enabled', () => {
    expect(() => assertProductionAuthConfigured(true, true)).not.toThrow();
  });

  it('allows non-production regardless of auth flag', () => {
    expect(() => assertProductionAuthConfigured(false, false)).not.toThrow();
  });
});
