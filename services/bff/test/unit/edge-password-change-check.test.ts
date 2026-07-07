import { createServer, type Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';
import type { FastifyInstance } from 'fastify';
import { clearJwksCache } from '@hims/ts-sdk-identity';
import { buildApp } from '../../src/main.js';

/**
 * End-to-end proof of the SERVER-SIDE forced-password-change gate — the control that
 * closes the "SPA-only enforcement" gap (CLAUDE.md: the frontend is UX, the backend is
 * authoritative). A principal whose UM row has `must_change_password=true` must be
 * refused on every NORMAL protected route (403 PASSWORD_CHANGE_REQUIRED, proxy never hit)
 * yet ALLOWED on the self-service identity + password-change routes needed to drive the
 * change. Once the flag clears, the SAME principal passes; an unflagged principal is
 * unaffected. The flag is read from authoritative UM state per request (the JWT is minted
 * at login and predates the reset), and a flagged verdict is uncached, so the unblock is
 * immediate. "Blocked" is proven by the proxy target NEVER being hit.
 */

const AUDIENCE = 'hims-platform';
const TENANT_A = '11111111-1111-1111-1111-111111111111';
const USER_FLAGGED = '22222222-2222-2222-2222-222222222222';
const USER_NORMAL = '33333333-3333-3333-3333-333333333333';
const KEY = 'um-s2s-secret';
const KID = 'test-key-1';

let keyPair: Awaited<ReturnType<typeof generateKeyPair>>;
let jwksServer: Server;
let backend: Server;
let issuer: string;

let proxied: Array<{ url: string; method: string | undefined }> = [];
let internalCalls: string[] = [];
/** UM rows currently flagged must_change_password=true (mutable to simulate the clear). */
const flagged = new Set<string>();

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

  // One server plays both roles: the UM internal status endpoint (the gate's target,
  // reporting must_change_password) and every proxied upstream route (the recorder).
  backend = createServer((req, res) => {
    const url = req.url ?? '';
    const m = url.match(/\/api\/user-management\/internal\/users\/([^/]+)\/active/);
    if (m) {
      const userId = decodeURIComponent(m[1]);
      internalCalls.push(userId);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ active: true, must_change_password: flagged.has(userId) }));
      return;
    }
    proxied.push({ url, method: req.method });
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
  process.env['INTEGRATION_HUB_URL'] = backendUrl;
  process.env['UM_INTERNAL_API_KEY'] = KEY;
});

afterAll(async () => {
  await close(jwksServer);
  await close(backend);
});

beforeEach(() => {
  proxied = [];
  internalCalls = [];
  flagged.clear();
  flagged.add(USER_FLAGGED);
  process.env['UM_INTERNAL_API_KEY'] = KEY;
  clearJwksCache();
});

describe('BFF edge forced-password-change gate', () => {
  let app: FastifyInstance;
  afterEach(async () => {
    if (app) await app.close();
  });

  it('BLOCKS a flagged principal on a normal route — 403 PASSWORD_CHANGE_REQUIRED, proxy NEVER hit', async () => {
    app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/user-management/users',
      headers: { authorization: `Bearer ${await mintToken(USER_FLAGGED)}` },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().code).toBe('PASSWORD_CHANGE_REQUIRED');
    expect(proxied).toHaveLength(0);
    expect(internalCalls).toEqual([USER_FLAGGED]);
  });

  it('ALLOWS a flagged principal to READ its own identity (/auth/me) to drive the screen', async () => {
    app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/user-management/auth/me',
      headers: { authorization: `Bearer ${await mintToken(USER_FLAGGED)}` },
    });
    expect(res.statusCode).toBe(200);
    expect(proxied).toHaveLength(1);
    expect(proxied[0]?.url).toBe('/api/user-management/auth/me');
  });

  it('ALLOWS a flagged principal to complete the change (/auth/change-password-complete)', async () => {
    app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/user-management/auth/change-password-complete',
      headers: {
        authorization: `Bearer ${await mintToken(USER_FLAGGED)}`,
        'content-type': 'application/json',
      },
      payload: {},
    });
    expect(res.statusCode).toBe(200);
    expect(proxied).toHaveLength(1);
    expect(proxied[0]?.url).toBe('/api/user-management/auth/change-password-complete');
  });

  it('UNBLOCKS immediately once the flag clears — the same principal now passes (verdict uncached)', async () => {
    app = await buildApp();
    const token = await mintToken(USER_FLAGGED);

    const blocked = await app.inject({
      method: 'GET',
      url: '/api/user-management/users',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(blocked.statusCode).toBe(403);
    expect(proxied).toHaveLength(0);

    // Admin's reset is cleared (as POST /auth/change-password-complete would): next
    // authoritative read reports false. No cache to bust — a flagged verdict is uncached.
    flagged.delete(USER_FLAGGED);

    const allowed = await app.inject({
      method: 'GET',
      url: '/api/user-management/users',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(allowed.statusCode).toBe(200);
    expect(proxied).toHaveLength(1);
    expect(internalCalls).toEqual([USER_FLAGGED, USER_FLAGGED]); // re-read, not cached
  });

  it('does NOT affect an unflagged principal — normal route proxied as usual', async () => {
    app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/user-management/users',
      headers: { authorization: `Bearer ${await mintToken(USER_NORMAL)}` },
    });
    expect(res.statusCode).toBe(200);
    expect(proxied).toHaveLength(1);
    expect(internalCalls).toEqual([USER_NORMAL]);
  });
});
