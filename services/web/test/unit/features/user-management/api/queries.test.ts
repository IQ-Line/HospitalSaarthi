import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assignableCapabilityCatalogOptions, runtimeCapabilityCatalogOptions } from '../../../../../src/features/user-management/api/queries';

// The endpoint each catalog query hits is closed over in a hoisted `url` const, so
// stringifying queryFn no longer reveals it. Observe the ACTUAL requested URL by
// mocking apiClient and invoking queryFn — strictly stronger than a source-text probe.
const apiClientMock = vi.hoisted(() => vi.fn(() => Promise.resolve([])));
vi.mock('@/lib/api-client', () => ({ apiClient: apiClientMock }));

describe('user-management capability catalog queries', () => {
  beforeEach(() => apiClientMock.mockClear());

  it('role editor uses tenant assignable runtime capabilities endpoint', async () => {
    const options = assignableCapabilityCatalogOptions();
    expect(options.queryKey).toContain('assignable');
    await (options.queryFn as () => Promise<unknown>)();
    expect(apiClientMock).toHaveBeenCalledTimes(1);
    expect(apiClientMock.mock.calls[0][0]).toContain('/capabilities/assignable');
  });

  it('admin catalog uses full runtime capabilities endpoint', async () => {
    const options = runtimeCapabilityCatalogOptions();
    await (options.queryFn as () => Promise<unknown>)();
    expect(apiClientMock).toHaveBeenCalledTimes(1);
    const url = apiClientMock.mock.calls[0][0];
    expect(url).toContain('/capabilities');
    expect(url).not.toContain('/capabilities/assignable');
  });
});
