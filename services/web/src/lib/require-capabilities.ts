import { redirect } from '@tanstack/react-router';
import { hasAllCapabilities, hasAnyCapability, hasCapability } from '@/lib/capabilities';

export type RequireCapabilityRedirectTo = string;

export type RequireCapabilityOptions = {
  redirectTo?: RequireCapabilityRedirectTo;
};

function deny(options?: RequireCapabilityOptions): never {
  throw redirect({ to: options?.redirectTo ?? '/dashboard' });
}

/**
 * TanStack Router `beforeLoad`: requires a single runtime capability key.
 */
export function requireCapability(
  capabilityKey: string,
  options?: RequireCapabilityOptions,
): () => void {
  return () => {
    if (!hasCapability(capabilityKey)) {
      deny(options);
    }
  };
}

/**
 * TanStack Router `beforeLoad`: requires any of the listed keys.
 */
export function requireAnyCapability(
  capabilityKeys: readonly string[],
  options?: RequireCapabilityOptions,
): () => void {
  return () => {
    if (!hasAnyCapability(capabilityKeys)) {
      deny(options);
    }
  };
}

/**
 * TanStack Router `beforeLoad`: requires every listed key.
 */
export function requireAllCapabilities(
  capabilityKeys: readonly string[],
  options?: RequireCapabilityOptions,
): () => void {
  return () => {
    if (!hasAllCapabilities(capabilityKeys)) {
      deny(options);
    }
  };
}

/** @deprecated Use {@link requireAnyCapability}. */
export function requireCapabilities(
  keys: string | readonly string[],
  options?: RequireCapabilityOptions & { mode?: 'any' | 'all' },
): () => void {
  const normalized = typeof keys === 'string' ? [keys] : [...keys];
  if (options?.mode === 'all') {
    return requireAllCapabilities(normalized, options);
  }
  if (normalized.length === 1) {
    return requireCapability(normalized[0]!, options);
  }
  return requireAnyCapability(normalized, options);
}
