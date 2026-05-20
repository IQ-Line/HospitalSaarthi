import type { ReactElement, ReactNode } from 'react';
import { useAllCapabilities, useAnyCapability, useCapability } from '@/hooks/use-capability';
import type { CapabilityKey } from '@/lib/capabilities';

export type CapabilityGateProps = {
  /** Single runtime capability key (e.g. `users:users:create`). */
  capability?: CapabilityKey;
  /** Grant when the principal holds any listed key (alias: `anyOf`). */
  any?: readonly CapabilityKey[];
  /** @deprecated Prefer `any` — kept for backward compatibility. */
  anyOf?: readonly CapabilityKey[];
  /** Grant only when every listed key is held (alias: `allOf`). */
  all?: readonly CapabilityKey[];
  /** @deprecated Prefer `all` — kept for backward compatibility. */
  allOf?: readonly CapabilityKey[];
  children: ReactNode;
  /** Rendered when the check fails (default: hide children). */
  fallback?: ReactNode;
};

function resolveAnyKeys(props: Pick<CapabilityGateProps, 'any' | 'anyOf'>): readonly CapabilityKey[] {
  const keys = props.any ?? props.anyOf ?? [];
  return keys;
}

function resolveAllKeys(props: Pick<CapabilityGateProps, 'all' | 'allOf'>): readonly CapabilityKey[] {
  const keys = props.all ?? props.allOf ?? [];
  return keys;
}

function useCapabilityGateAllowed({
  capability,
  any,
  anyOf,
  all,
  allOf,
}: Pick<CapabilityGateProps, 'capability' | 'any' | 'anyOf' | 'all' | 'allOf'>): boolean {
  const anyKeys = resolveAnyKeys({ any, anyOf });
  const allKeys = resolveAllKeys({ all, allOf });

  const hasCapability = useCapability(capability ?? '');
  const hasAny = useAnyCapability(anyKeys);
  const hasAll = useAllCapabilities(allKeys);

  if (allKeys.length > 0) {
    return hasAll;
  }
  if (anyKeys.length > 0) {
    return hasAny;
  }
  if (capability) {
    return hasCapability;
  }
  return false;
}

/**
 * UX-only gate on runtime capability keys. PDP / APIs remain authoritative.
 *
 * @see `docs/architecture/authorization/capability-key-first.md`
 */
export function CapabilityGate({
  capability,
  any,
  anyOf,
  all,
  allOf,
  children,
  fallback = null,
}: CapabilityGateProps): ReactElement {
  const allowed = useCapabilityGateAllowed({ capability, any, anyOf, all, allOf });
  if (!allowed) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
