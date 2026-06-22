import { describe, expect, it } from 'vitest';
import { assignableCapabilityCatalogOptions, runtimeCapabilityCatalogOptions } from '../../../../../src/features/user-management/api/queries';

describe('user-management capability catalog queries', () => {
  it('role editor uses tenant assignable runtime capabilities endpoint', () => {
    const options = assignableCapabilityCatalogOptions();
    expect(options.queryKey).toContain('assignable');
    expect(String(options.queryFn)).toContain('/capabilities/assignable');
  });

  it('admin catalog uses full runtime capabilities endpoint', () => {
    const options = runtimeCapabilityCatalogOptions();
    expect(String(options.queryFn)).toContain('/capabilities');
    expect(String(options.queryFn)).not.toContain('/capabilities/assignable');
  });
});
