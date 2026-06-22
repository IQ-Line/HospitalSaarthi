import { describe, expect, it } from 'vitest';
import { areCapabilityIdsEqual, capabilityIdsSignature } from '../../../../../src/features/user-management/lib/capability-id-set';

describe('capabilityIdsSignature', () => {
  it('is order-independent', () => {
    expect(capabilityIdsSignature(['b', 'a'])).toBe(capabilityIdsSignature(['a', 'b']));
  });

  it('detects equal sets', () => {
    expect(areCapabilityIdsEqual(['a', 'b'], ['b', 'a'])).toBe(true);
    expect(areCapabilityIdsEqual(['a'], ['a', 'b'])).toBe(false);
  });
});
