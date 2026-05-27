import { describe, expect, it } from 'vitest';
import { defaultVisitpadLandingPath, firstAccessibleVisitpadPath } from './visitpad-default-route';

describe('defaultVisitpadLandingPath', () => {
  it('returns the first manifest leaf route', () => {
    expect(defaultVisitpadLandingPath()).toBe('/visitpad/units');
  });
});

describe('firstAccessibleVisitpadPath', () => {
  it('returns null when principal has no visitpad keys', () => {
    expect(firstAccessibleVisitpadPath(new Set())).toBeNull();
  });

  it('returns first permitted leaf in manifest order', () => {
    const keys = new Set(['vitals:vitals:read']);
    expect(firstAccessibleVisitpadPath(keys)).toBe('/visitpad/vitals');
  });

  it('returns first leaf for visitpad-master shell keys without L3 keys', () => {
    const keys = new Set(['visitpad-master:visitpad:view']);
    expect(firstAccessibleVisitpadPath(keys)).toBe('/visitpad/units');
  });
});
