import type { IntegrationConfig } from "../domain/integration.types.js";
import { assertAllowedOperationsSubset } from "../domain/partner-exposed-operations.js";

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value.filter((item): item is string => typeof item === "string" && item.length > 0);
  return out;
}

function readAllowedOperations(raw: Record<string, unknown>): string[] | undefined {
  return (
    asStringArray(raw.allowedOperations) ??
    asStringArray(raw.allowed_operations)
  );
}

function readSuggestedCapabilityKeys(raw: Record<string, unknown>): string[] | undefined {
  return (
    asStringArray(raw.suggestedCapabilityKeys) ??
    asStringArray(raw.suggested_capability_keys) ??
    asStringArray(raw.capabilityKeys) ??
    asStringArray(raw.capability_keys)
  );
}

export function normalizeIntegrationConfig(
  raw: unknown,
  defaults: { allowedOperations: string[]; suggestedCapabilityKeys?: string[] },
): IntegrationConfig {
  const source =
    raw !== null && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const allowedOperations = readAllowedOperations(source) ?? defaults.allowedOperations;
  assertAllowedOperationsSubset(allowedOperations);

  const suggested =
    readSuggestedCapabilityKeys(source) ?? defaults.suggestedCapabilityKeys ?? [];

  const config: IntegrationConfig = { allowedOperations };
  if (suggested.length > 0) {
    config.suggestedCapabilityKeys = [...new Set(suggested)];
  }
  return config;
}

export function stripSuggestedCapabilityKeys(config: IntegrationConfig): IntegrationConfig {
  const { suggestedCapabilityKeys: _removed, ...rest } = config;
  return { allowedOperations: [...rest.allowedOperations] };
}

export function mergeIntegrationConfigUpdate(
  current: IntegrationConfig,
  patch: Partial<IntegrationConfig>,
  options: { allowSuggestedCapabilityKeys: boolean },
): IntegrationConfig {
  const allowedOperations = patch.allowedOperations ?? current.allowedOperations;
  assertAllowedOperationsSubset(allowedOperations);

  const next: IntegrationConfig = { allowedOperations: [...allowedOperations] };

  if (options.allowSuggestedCapabilityKeys) {
    const suggested =
      patch.suggestedCapabilityKeys ?? current.suggestedCapabilityKeys ?? [];
    if (suggested.length > 0) {
      next.suggestedCapabilityKeys = [...new Set(suggested)];
    }
  }

  return next;
}

export function resolveSuggestedCapabilityKeysForActivation(
  config: IntegrationConfig,
  catalogDefaults: string[],
): string[] {
  const fromConfig = config.suggestedCapabilityKeys ?? [];
  if (fromConfig.length > 0) {
    return [...fromConfig];
  }
  return [...catalogDefaults];
}
