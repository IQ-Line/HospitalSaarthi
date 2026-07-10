import { describe, expect, it } from 'vitest';
import { UM_USER_READ } from '@/lib/runtime-capability-keys';
import { capabilityKeysFromPrincipalAttributes } from '@/lib/principal-capabilities';

describe('hydrateCapabilitiesFromPrincipal keys', () => {
  it('uses principal capabilities only (no manifest shell merge for super-admin)', () => {
    const keys = capabilityKeysFromPrincipalAttributes({
      capabilities: [UM_USER_READ],
    });

    expect(keys).toEqual([UM_USER_READ]);
  });
});
