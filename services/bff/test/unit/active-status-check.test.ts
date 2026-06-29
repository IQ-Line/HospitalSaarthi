import { describe, expect, it, vi } from 'vitest';
import {
  createActiveStatusChecker,
  type ActiveStatusSubject,
} from '../../src/active-status-check.js';

const UM = 'http://um.test';
const KEY = 's2s-key';
const SUBJECT: ActiveStatusSubject = {
  userId: 'user-1',
  tenantId: '11111111-1111-4111-8111-111111111111',
};

type Call = { url: string; key: string | undefined };

/** A recording fetch stub returning real `Response`s (so .ok/.status/.json behave). */
function recorder(
  respond: (call: number) => Response | Promise<Response>,
): { fetchImpl: (input: string | URL, init?: RequestInit) => Promise<Response>; calls: Call[] } {
  const calls: Call[] = [];
  return {
    calls,
    fetchImpl: async (input, init) => {
      const headers = (init?.headers ?? {}) as Record<string, string>;
      calls.push({ url: String(input), key: headers['x-um-internal-key'] });
      return respond(calls.length - 1);
    },
  };
}

const ok = (body: unknown): Response =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

describe('createActiveStatusChecker', () => {
  it('calls the UM active endpoint with the key + tenant query and returns active:true', async () => {
    const { fetchImpl, calls } = recorder(() => ok({ active: true }));
    const isActive = createActiveStatusChecker({ userManagementUrl: UM, internalApiKey: KEY, fetchImpl });

    expect(await isActive(SUBJECT)).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.key).toBe(KEY);
    expect(calls[0]?.url).toBe(
      `${UM}/api/user-management/internal/users/${SUBJECT.userId}/active?tenant_id=${SUBJECT.tenantId}`,
    );
  });

  it('returns active:false for a banned/inactive user', async () => {
    const { fetchImpl } = recorder(() => ok({ active: false }));
    const isActive = createActiveStatusChecker({ userManagementUrl: UM, internalApiKey: KEY, fetchImpl });
    expect(await isActive(SUBJECT)).toBe(false);
  });

  it('caches a verdict within the TTL (one fetch for repeated calls)', async () => {
    let t = 1_000;
    const { fetchImpl, calls } = recorder(() => ok({ active: false }));
    const isActive = createActiveStatusChecker({
      userManagementUrl: UM,
      internalApiKey: KEY,
      ttlMs: 30_000,
      now: () => t,
      fetchImpl,
    });
    expect(await isActive(SUBJECT)).toBe(false);
    t = 20_000; // still within TTL
    expect(await isActive(SUBJECT)).toBe(false);
    expect(calls).toHaveLength(1);
  });

  it('re-fetches once the TTL has elapsed', async () => {
    let t = 1_000;
    const { fetchImpl, calls } = recorder(() => ok({ active: true }));
    const isActive = createActiveStatusChecker({
      userManagementUrl: UM,
      internalApiKey: KEY,
      ttlMs: 30_000,
      now: () => t,
      fetchImpl,
    });
    expect(await isActive(SUBJECT)).toBe(true);
    t = 40_000; // past TTL
    expect(await isActive(SUBJECT)).toBe(true);
    expect(calls).toHaveLength(2);
  });

  it('FAILS OPEN on a non-200 and does NOT cache it (retries next call)', async () => {
    const { fetchImpl, calls } = recorder(() => new Response('nope', { status: 503 }));
    const isActive = createActiveStatusChecker({ userManagementUrl: UM, internalApiKey: KEY, fetchImpl });
    expect(await isActive(SUBJECT)).toBe(true);
    expect(await isActive(SUBJECT)).toBe(true);
    expect(calls).toHaveLength(2); // not cached -> fetched again
  });

  it('FAILS OPEN when UM is unreachable / throws, and does NOT cache the fail-open (retries)', async () => {
    const { fetchImpl, calls } = recorder(() => {
      throw new Error('ECONNREFUSED');
    });
    const isActive = createActiveStatusChecker({ userManagementUrl: UM, internalApiKey: KEY, fetchImpl });
    expect(await isActive(SUBJECT)).toBe(true);
    expect(await isActive(SUBJECT)).toBe(true);
    expect(calls).toHaveLength(2); // not cached -> fetched again
  });

  it('FAILS OPEN on a 200 body missing a boolean `active`, and does NOT cache it', async () => {
    const { fetchImpl, calls } = recorder(() => ok({ status: 'weird' }));
    const isActive = createActiveStatusChecker({ userManagementUrl: UM, internalApiKey: KEY, fetchImpl });
    expect(await isActive(SUBJECT)).toBe(true);
    expect(await isActive(SUBJECT)).toBe(true);
    expect(calls).toHaveLength(2); // not cached
  });

  it('FAILS OPEN on a 200 with non-JSON body, and does NOT cache it', async () => {
    const { fetchImpl, calls } = recorder(() => new Response('<html>oops</html>', { status: 200 }));
    const isActive = createActiveStatusChecker({ userManagementUrl: UM, internalApiKey: KEY, fetchImpl });
    expect(await isActive(SUBJECT)).toBe(true);
    expect(await isActive(SUBJECT)).toBe(true);
    expect(calls).toHaveLength(2); // not cached
  });

  it('FAILS OPEN when the request exceeds the timeout (the abort signal fires)', async () => {
    let started = 0;
    // Honors the abort signal but never resolves on its own — so without the timeout
    // wiring this hangs (and the test times out), pinning that the timeout is applied.
    const fetchImpl = (_input: string | URL, init?: RequestInit): Promise<Response> =>
      new Promise((_resolve, reject) => {
        started += 1;
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      });
    const isActive = createActiveStatusChecker({
      userManagementUrl: UM,
      internalApiKey: KEY,
      timeoutMs: 20,
      fetchImpl,
    });
    expect(await isActive(SUBJECT)).toBe(true);
    expect(started).toBe(1);
  });

  it('logs at ERROR (not warn) when UM rejects the S2S key — a silent-misconfig guard', async () => {
    const log = { warn: vi.fn(), error: vi.fn() };
    const { fetchImpl } = recorder(() => new Response('forbidden', { status: 401 }));
    const isActive = createActiveStatusChecker({ userManagementUrl: UM, internalApiKey: KEY, fetchImpl, log });
    expect(await isActive(SUBJECT)).toBe(true); // still fails open
    expect(log.error).toHaveBeenCalledTimes(1);
    expect(log.warn).not.toHaveBeenCalled();
  });

  it('logs at WARN (not error) on a transient non-200 (e.g. 503)', async () => {
    const log = { warn: vi.fn(), error: vi.fn() };
    const { fetchImpl } = recorder(() => new Response('down', { status: 503 }));
    const isActive = createActiveStatusChecker({ userManagementUrl: UM, internalApiKey: KEY, fetchImpl, log });
    expect(await isActive(SUBJECT)).toBe(true);
    expect(log.warn).toHaveBeenCalledTimes(1);
    expect(log.error).not.toHaveBeenCalled();
  });

  it('bounds the cache: evicts under the cap (oldest entry re-fetches)', async () => {
    const t = 1_000;
    const { fetchImpl, calls } = recorder(() => ok({ active: true }));
    const isActive = createActiveStatusChecker({
      userManagementUrl: UM,
      internalApiKey: KEY,
      maxEntries: 2,
      now: () => t, // freeze time so eviction (not TTL) is what drops entries
      fetchImpl,
    });
    const sub = (id: string): ActiveStatusSubject => ({ userId: id, tenantId: SUBJECT.tenantId });

    await isActive(sub('a')); // cache: a
    await isActive(sub('b')); // cache: a,b (at cap)
    await isActive(sub('c')); // cap hit -> evict oldest (a) -> cache: b,c
    expect(calls).toHaveLength(3);

    await isActive(sub('b')); // still cached -> no fetch
    expect(calls).toHaveLength(3);

    await isActive(sub('a')); // was evicted -> re-fetch
    expect(calls).toHaveLength(4);
  });
});
