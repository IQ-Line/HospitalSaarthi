import { describe, expect, it } from 'vitest';
import { isPlatformSuperAdmin } from '../../src/main.js';

/**
 * Pure-function unit tests for the cross-tenant exception predicate. These live apart
 * from the edge-auth integration tests because they need none of the JWKS/upstream
 * harness — and because the integration path normalizes roles in the SDK (verify.ts
 * `sanitizeRoles`) BEFORE they reach `request.user`, so only direct calls can exercise
 * this function's own normalization + multi-role matching.
 */
describe('isPlatformSuperAdmin', () => {
  it('recognizes the canonical super-admin role', () => {
    expect(isPlatformSuperAdmin(['super-admin'])).toBe(true);
  });

  it('normalizes case and surrounding whitespace in the role claim', () => {
    expect(isPlatformSuperAdmin(['  Super-Admin '])).toBe(true);
  });

  it('matches when super-admin is one of several roles (.some, not .every)', () => {
    expect(isPlatformSuperAdmin(['doctor', 'super-admin'])).toBe(true);
  });

  it('returns false for a non-super-admin role set', () => {
    expect(isPlatformSuperAdmin(['doctor', 'nurse'])).toBe(false);
  });

  it('returns false for an empty role set', () => {
    expect(isPlatformSuperAdmin([])).toBe(false);
  });

  it('requires the exact hyphenated code — "superadmin" does not match', () => {
    expect(isPlatformSuperAdmin(['superadmin'])).toBe(false);
  });
});
