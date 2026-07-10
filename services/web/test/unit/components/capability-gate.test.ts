// @vitest-environment happy-dom
import { createElement, type ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CapabilityGate, type CapabilityGateProps } from '@/components/capability-gate';
import { usePermissionsStore } from '@/stores/permissions.store';

const CREATE = 'users:users:create';
const READ = 'users:users:read';
const ASSIGN = 'user-roles:role:assign';

function grant(keys: readonly string[]): void {
  usePermissionsStore.getState().setCapabilityKeys(keys);
}

/** Renders the REAL component and reports whether children made it to the DOM. */
function renderGate(props: Omit<CapabilityGateProps, 'children' | 'fallback'>): {
  allowed: boolean;
  fallbackShown: boolean;
} {
  const fallback: ReactNode = createElement('span', null, 'denied-fallback');
  render(createElement(CapabilityGate, { ...props, fallback, children: 'gated-children' }));
  const allowed = screen.queryByText('gated-children') !== null;
  const fallbackShown = screen.queryByText('denied-fallback') !== null;
  // The gate is binary: exactly one of children/fallback must render.
  expect(allowed).not.toBe(fallbackShown);
  return { allowed, fallbackShown };
}

beforeEach(() => {
  usePermissionsStore.getState().clearPermissions();
});
afterEach(cleanup);

describe('CapabilityGate (real component)', () => {
  describe('single capability', () => {
    it('renders children when the key is held', () => {
      grant([CREATE]);
      expect(renderGate({ capability: CREATE }).allowed).toBe(true);
    });

    it('renders the fallback when the key is not held', () => {
      grant([CREATE]);
      const result = renderGate({ capability: READ });
      expect(result.allowed).toBe(false);
      expect(result.fallbackShown).toBe(true);
    });
  });

  describe('any semantics', () => {
    it('allows when at least one listed key is held', () => {
      grant([READ]);
      expect(renderGate({ any: [READ, CREATE] }).allowed).toBe(true);
    });

    it('denies when none of the listed keys are held', () => {
      grant([READ]);
      expect(renderGate({ any: [CREATE, ASSIGN] }).allowed).toBe(false);
    });
  });

  describe('all semantics', () => {
    it('allows only when every listed key is held', () => {
      grant([READ, ASSIGN]);
      expect(renderGate({ all: [READ, ASSIGN] }).allowed).toBe(true);
    });

    it('denies when any listed key is missing', () => {
      grant([READ]);
      expect(renderGate({ all: [READ, ASSIGN] }).allowed).toBe(false);
    });
  });

  describe('precedence: all > any > single', () => {
    it('a failing `all` denies even though `any` and `capability` would both pass', () => {
      grant([READ]);
      expect(
        renderGate({ all: [READ, ASSIGN], any: [READ], capability: READ }).allowed,
      ).toBe(false);
    });

    it('a passing `all` allows even though `any` and `capability` would both fail', () => {
      grant([READ, ASSIGN]);
      expect(
        renderGate({ all: [READ, ASSIGN], any: [CREATE], capability: CREATE }).allowed,
      ).toBe(true);
    });

    it('with no `all`, a failing `any` denies even though `capability` would pass', () => {
      grant([READ]);
      expect(renderGate({ any: [CREATE], capability: READ }).allowed).toBe(false);
    });

    it('with no `all`, a passing `any` allows even though `capability` would fail', () => {
      grant([READ]);
      expect(renderGate({ any: [READ], capability: CREATE }).allowed).toBe(true);
    });
  });

  describe('alias props (anyOf / allOf)', () => {
    it('anyOf behaves like any (allow and deny)', () => {
      grant([READ]);
      expect(renderGate({ anyOf: [READ, CREATE] }).allowed).toBe(true);
      cleanup();
      expect(renderGate({ anyOf: [CREATE, ASSIGN] }).allowed).toBe(false);
    });

    it('allOf behaves like all (allow and deny)', () => {
      grant([READ, ASSIGN]);
      expect(renderGate({ allOf: [READ, ASSIGN] }).allowed).toBe(true);
      cleanup();
      expect(renderGate({ allOf: [READ, CREATE] }).allowed).toBe(false);
    });

    it('canonical `any` wins over `anyOf` when both are given', () => {
      grant([READ]);
      expect(renderGate({ any: [READ], anyOf: [CREATE] }).allowed).toBe(true);
      cleanup();
      expect(renderGate({ any: [CREATE], anyOf: [READ] }).allowed).toBe(false);
    });

    it('canonical `all` wins over `allOf` when both are given', () => {
      grant([READ, ASSIGN]);
      expect(renderGate({ all: [READ, ASSIGN], allOf: [CREATE] }).allowed).toBe(true);
      cleanup();
      expect(renderGate({ all: [CREATE], allOf: [READ, ASSIGN] }).allowed).toBe(false);
    });

    it('a failing allOf takes precedence over a passing anyOf and single capability', () => {
      grant([READ]);
      expect(
        renderGate({ allOf: [READ, ASSIGN], anyOf: [READ], capability: READ }).allowed,
      ).toBe(false);
    });
  });

  it('denies (renders fallback) when no gate props are given', () => {
    grant([READ]);
    const result = renderGate({});
    expect(result.allowed).toBe(false);
    expect(result.fallbackShown).toBe(true);
  });

  it('renders nothing (no fallback default) when denied without an explicit fallback', () => {
    grant([]);
    const { container } = render(
      createElement(CapabilityGate, { capability: CREATE, children: 'gated-children' }),
    );
    expect(container.textContent).toBe('');
  });
});
