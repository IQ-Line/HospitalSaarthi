import { describe, expect, it } from 'vitest';
import { resolveTenantDisplayName } from './tenant-display-name';

describe('resolveTenantDisplayName', () => {
  it('returns fallback for UUID-like names', () => {
    expect(resolveTenantDisplayName('6f3af35f-5009-4547-8016-7405778f01b7')).toBe('HIMS');
  });

  it('returns human-readable tenant name', () => {
    expect(resolveTenantDisplayName('Dev Hospital')).toBe('Dev Hospital');
  });

  it('returns fallback for empty input', () => {
    expect(resolveTenantDisplayName('')).toBe('HIMS');
    expect(resolveTenantDisplayName(null)).toBe('HIMS');
  });
});
