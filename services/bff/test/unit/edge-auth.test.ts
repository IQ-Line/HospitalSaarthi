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
  } = {},
): Promise<string> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload: Record<string, unknown> = { jti: randomUUID(), roles: ['doctor'] };
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

  it('passes the client-selected iq_tenant_id through unchanged (tenant scope is NOT pinned here)', async () => {
    app = await buildApp();
    const otherTenant = '99999999-9999-9999-9999-999999999999';
    const token = await mintToken();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/opd/prescriptions',
      headers: { authorization: `Bearer ${token}`, 'iq_tenant_id': otherTenant },
    });
    expect(res.statusCode).toBe(200);
    expect(echoedHeaders(res)['iq_tenant_id']).toBe(otherTenant);
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
