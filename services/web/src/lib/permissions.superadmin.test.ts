import { describe, expect, it, beforeEach } from 'vitest';
import { CFG_SHELL_ACCESS, UM_USER_READ } from '@/lib/runtime-capability-keys';
import {
  clearModuleRegistryForTests,
  registerBuiltinModuleManifests,
} from '@/platform/modules';
import { capabilityKeysForShellPrincipal } from './permissions';

describe('capabilityKeysForShellPrincipal', () => {
  beforeEach(() => {
    clearModuleRegistryForTests();
    registerBuiltinModuleManifests();
  });

  it('merges manifest navigation keys for super-admin', () => {
    const keys = capabilityKeysForShellPrincipal({
      id: 'user-1',
      roles: ['super-admin'],
      attributes: { capabilities: [UM_USER_READ] },
    });

    expect(keys).toContain(UM_USER_READ);
    expect(keys).toContain(CFG_SHELL_ACCESS);
  });

  it('does not expand keys for non-super-admin roles', () => {
    const keys = capabilityKeysForShellPrincipal({
      id: 'user-2',
      roles: ['tenant-admin'],
      attributes: { capabilities: [UM_USER_READ] },
    });

    expect(keys).toEqual([UM_USER_READ]);
    expect(keys).not.toContain(CFG_SHELL_ACCESS);
  });
});
