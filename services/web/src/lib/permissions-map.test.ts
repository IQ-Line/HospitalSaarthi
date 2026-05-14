import { describe, expect, it } from 'vitest';
import {
  buildDevPermissionMap,
  projectCerbosActionsToWrite,
  projectUnknownActionsToWrite,
  VISITPAD_CATALOG_FEATURE,
  VISITPAD_TEMPLATES_MODULE,
} from './permissions-map';

describe('projectCerbosActionsToWrite', () => {
  it('treats manage as read and write', () => {
    expect(projectCerbosActionsToWrite(['manage'])).toEqual({ read: true, write: true });
  });

  it('read only', () => {
    expect(projectCerbosActionsToWrite(['read'])).toEqual({ read: true, write: false });
  });

  it('update implies write not read', () => {
    expect(projectCerbosActionsToWrite(['update'])).toEqual({ read: false, write: true });
  });

  it('read plus update', () => {
    expect(projectCerbosActionsToWrite(['read', 'update'])).toEqual({ read: true, write: true });
  });
});

describe('projectUnknownActionsToWrite', () => {
  it('filters unknown tokens', () => {
    expect(projectUnknownActionsToWrite(['read', 'custom', 'update'])).toEqual({ read: true, write: true });
  });
});

describe('buildDevPermissionMap', () => {
  it('superadmin has visitpad catalog write', () => {
    const m = buildDevPermissionMap('superadmin');
    expect(m[VISITPAD_TEMPLATES_MODULE][VISITPAD_CATALOG_FEATURE].write).toBe(true);
  });

  it('tenant-catalog-readonly has read not write on visitpad', () => {
    const m = buildDevPermissionMap('tenant-catalog-readonly');
    expect(m[VISITPAD_TEMPLATES_MODULE][VISITPAD_CATALOG_FEATURE].read).toBe(true);
    expect(m[VISITPAD_TEMPLATES_MODULE][VISITPAD_CATALOG_FEATURE].write).toBe(false);
  });
});
