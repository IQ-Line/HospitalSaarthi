import { describe, expect, it } from 'vitest';
import {
  getFormWorkflowBuilderOrigin,
  getLcNcClientId,
  isPageBuilderRoute,
  PAGE_BUILDER_CLIENT_ID,
  PAGE_BUILDER_ROUTE_PATHS,
} from './lc-nc-config';

describe('lc-nc-config', () => {
  it('uses hardcoded page-builder client id', () => {
    expect(getLcNcClientId()).toBe(PAGE_BUILDER_CLIENT_ID);
  });

  it('matches only configured page-builder routes', () => {
    expect(PAGE_BUILDER_ROUTE_PATHS).toContain('/frontdesk/create-opd-registration');
    expect(isPageBuilderRoute('/frontdesk/create-opd-registration')).toBe(true);
    expect(isPageBuilderRoute('/frontdesk/create-opd-registration/')).toBe(true);
    expect(isPageBuilderRoute('/frontdesk')).toBe(false);
    expect(isPageBuilderRoute('/dashboard')).toBe(false);
  });

  it('uses same-origin workflow-backend proxy in dev', () => {
    expect(getFormWorkflowBuilderOrigin()).toMatch(/\/workflow-backend$/);
  });
});
