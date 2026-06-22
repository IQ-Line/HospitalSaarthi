import { describe, expect, it } from 'vitest';
import {
  decodeAccessTokenPayload,
  getRolesFromAccessToken,
  isSuperAdminRole,
} from '../../../src/lib/access-token';

function encodePayload(payload: object): string {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${header}.${body}.sig`;
}

describe('access-token', () => {
  it('decodes roles from a JWT payload', () => {
    const token = encodePayload({ roles: ['super-admin', 'other'] });
    expect(getRolesFromAccessToken(token)).toEqual(['super-admin', 'other']);
    expect(isSuperAdminRole(getRolesFromAccessToken(token))).toBe(true);
  });

  it('returns empty roles for non-JWT tokens', () => {
    expect(getRolesFromAccessToken('dev-token')).toEqual([]);
    expect(decodeAccessTokenPayload('dev-token')).toBeNull();
  });

  it('isSuperAdminRole is false without super-admin', () => {
    expect(isSuperAdminRole(['tenant-admin'])).toBe(false);
  });

  it('reads super-admin from user_role claim', () => {
    const token = encodePayload({ user_role: 'super-admin' });
    expect(getRolesFromAccessToken(token)).toEqual(['super-admin']);
    expect(isSuperAdminRole(getRolesFromAccessToken(token))).toBe(true);
  });
});
