import { describe, expect, it } from 'vitest';
import { isPlatformSuperAdmin } from '../../src/main.js';

/**
 * Pure-function unit tests for the cross-tenant exception predicate. Authority is now the bounded
 * `scope:platform` claim (issued only from platform_admins membership on a signed token), NOT the
 * former `super-admin` role string a tenant could mint. These live apart from the edge-auth
 * integration tests because they need none of the JWKS/upstream harness.
 */
describe('isPlatformSuperAdmin', () => {
  it('recognizes the platform scope', () => {
    expect(isPlatformSuperAdmin(['platform'])).toBe(true);
  });

  it('matches when platform is one of several scopes (.includes)', () => {
    expect(isPlatformSuperAdmin(['other', 'platform'])).toBe(true);
  });

  it('returns false for a non-platform scope set', () => {
    expect(isPlatformSuperAdmin(['tenant', 'org'])).toBe(false);
  });

  it('returns false for an empty scope set', () => {
    expect(isPlatformSuperAdmin([])).toBe(false);
  });

  it('returns false when scopes are undefined', () => {
    expect(isPlatformSuperAdmin(undefined)).toBe(false);
  });

  it('does NOT match the dead "super-admin" role string (string is no longer authority)', () => {
    expect(isPlatformSuperAdmin(['super-admin'])).toBe(false);
  });
});
