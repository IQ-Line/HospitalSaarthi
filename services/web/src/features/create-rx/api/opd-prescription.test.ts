import { describe, expect, it } from 'vitest';
import { isPatientScopedOpdRoute } from './opd-prescription';

describe('isPatientScopedOpdRoute', () => {
  it('is true when route visit id equals patient id (new consultation)', () => {
    const id = '2ec2becd-f01a-48b5-9cec-929b9c870d8a';
    expect(isPatientScopedOpdRoute(id, id)).toBe(true);
  });

  it('is false when an OPD visit id is used', () => {
    expect(
      isPatientScopedOpdRoute(
        'd3905ec5-f0a3-411d-b561-35bda0ec1947',
        '2ec2becd-f01a-48b5-9cec-929b9c870d8a',
      ),
    ).toBe(false);
  });
});
