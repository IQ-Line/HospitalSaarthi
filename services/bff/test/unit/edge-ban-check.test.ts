import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';
import type { FastifyInstance } from 'fastify';
import { clearJwksCache } from '@hims/ts-sdk-identity';
import { buildApp } from '../../src/main.js';

/**
 * End-to-end proof of the D13 ban-cutoff WIRING — the gap a checker unit test can't see:
 * does the edge hook actually invoke the active-status check, 401 a banned user BEFORE
 * the proxy, let an active user through, and fail OPEN when UM is unreachable? Uses a real
 * JWKS server + real jose tokens + a combined UM-stub/upstream-recorder. "Blocked" is
 * proven by the proxy target NEVER being hit.
 */

const AUDIENCE = 'hims-platform';
const TENANT_A = '11111111-1111-1111-1111-111111111111';
const USER_ACTIVE = '22222222-2222-2222-2222-222222222222';
const USER_BANNED = '33333333-3333-3333-3333-333333333333';
const KEY = 'um-s2s-secret';
const KID = 'test-key-1';

let keyPair: Awaited<ReturnType<typeof generateKeyPair>>;
let jwksServer: Server;
let backend: Server;
let issuer: string;

type InternalCall = { userId: string; key: string | undefined };
let proxied: Array<{ url: string; headers: IncomingHttpHeaders }> = [];
let internalCalls: InternalCall[] = [];
let umDown = false;

function listen(server: Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve((server.address() as AddressInfo).port));
  });
}
const close = (server: Server): Promise<void> =>
  new Promise((resolve) => server.close(() => resolve()));

async function mintToken(sub: string): Promise<string> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return new SignJWT({ jti: randomUUID(), roles: ['doctor'], iq_tenant_id: TENANT_A })
    .setProtectedHeader({ alg: 'RS256', kid: KID })
    .setSubject(sub)
    .setIssuer(issuer)
    .setAudience(AUDIENCE)
    .setIssuedAt(nowSeconds)
    .setExpirationTime(nowSeconds + 120)
    .sign(keyPair.privateKey);
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

  // One server plays both roles, dispatching by path: the UM internal active-status
  // endpoint (the ban-check target) and the proxied upstream (the recorder).
  backend = createServer((req, res) => {
    const url = req.url ?? '';
    const m = url.match(/\/api\/user-management\/internal\/users\/([^/]+)\/active/);
    if (m) {
      internalCalls.push({ userId: decodeURIComponent(m[1]), key: req.headers['x-um-internal-key'] as string | undefined });
      if (umDown) {
        res.writeHead(500);
        res.end();
        return;
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ active: decodeURIComponent(m[1]) === USER_ACTIVE }));
      return;
    }
    proxied.push({ url, headers: req.headers });
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  });
  const backendPort = await listen(backend);
  const backendUrl = `http://127.0.0.1:${backendPort}`;

  process.env['LOG_LEVEL'] = 'silent';
  process.env['NODE_ENV'] = 'test';
  process.env['ENABLE_AUTH'] = 'true';
  process.env['JWT_ISSUER'] = issuer;
  process.env['JWKS_URL'] = `${issuer}/api/auth/.well-known/jwks.json`;
  process.env['JWT_AUDIENCE'] = AUDIENCE;
  process.env['USER_MANAGEMENT_URL'] = backendUrl;
  process.env['OPD_URL'] = backendUrl;
  process.env['INTEGRATION_HUB_URL'] = backendUrl; // /api/v3 public-route proxy target
  process.env['UM_INTERNAL_API_KEY'] = KEY;
});

afterAll(async () => {
  await close(jwksServer);
  await close(backend);
});

beforeEach(() => {
  proxied = [];
  internalCalls = [];
  umDown = false;
  process.env['UM_INTERNAL_API_KEY'] = KEY;
  clearJwksCache();
});

describe('BFF edge ban/revocation cutoff', () => {
  let app: FastifyInstance;
  afterEach(async () => {
    if (app) await app.close();
  });

  it('lets an active user through — proxied, and the ban-check carried the S2S key', async () => {
    app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/opd/prescriptions',
      headers: { authorization: `Bearer ${await mintToken(USER_ACTIVE)}` },
    });
    expect(res.statusCode).toBe(200);
    expect(proxied).toHaveLength(1);
    expect(internalCalls).toEqual([{ userId: USER_ACTIVE, key: KEY }]);
  });

  it('cuts off a banned user — 401 USER_INACTIVE, proxy NEVER hit', async () => {
    app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/opd/prescriptions',
      headers: { authorization: `Bearer ${await mintToken(USER_BANNED)}` },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().code).toBe('USER_INACTIVE');
    expect(proxied).toHaveLength(0);
    expect(internalCalls).toHaveLength(1);
  });

  it('caches the verdict — a second request in the TTL does not re-call UM', async () => {
    app = await buildApp();
    const token = await mintToken(USER_ACTIVE);
    await app.inject({ method: 'GET', url: '/api/v1/opd/x', headers: { authorization: `Bearer ${token}` } });
    await app.inject({ method: 'GET', url: '/api/v1/opd/y', headers: { authorization: `Bearer ${token}` } });
    expect(proxied).toHaveLength(2);
    expect(internalCalls).toHaveLength(1); // cached
  });

  it('FAILS OPEN when UM is down — the request is still proxied (not blocked)', async () => {
    umDown = true;
    app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/opd/prescriptions',
      headers: { authorization: `Bearer ${await mintToken(USER_BANNED)}` },
    });
    expect(res.statusCode).toBe(200); // fail-open: even a (would-be) banned user passes
    expect(proxied).toHaveLength(1);
    expect(internalCalls).toHaveLength(1);
  });

  it('is DISABLED when UM_INTERNAL_API_KEY is unset — no ban-check, request proxied', async () => {
    delete process.env['UM_INTERNAL_API_KEY'];
    app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/opd/prescriptions',
      headers: { authorization: `Bearer ${await mintToken(USER_BANNED)}` },
    });
    expect(res.statusCode).toBe(200);
    expect(proxied).toHaveLength(1);
    expect(internalCalls).toHaveLength(0); // checker never created
  });

  it('does not run the ban-check on public routes (no principal)', async () => {
    app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v3/hip/token/on-generate-token',
      payload: { ack: true },
    });
    expect(res.statusCode).toBe(200);
    expect(proxied).toHaveLength(1);
    expect(internalCalls).toHaveLength(0);
  });
});
