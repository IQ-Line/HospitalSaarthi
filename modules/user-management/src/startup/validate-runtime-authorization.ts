import {
  assertValidRuntimeCapabilityRow,
  findDuplicateCapabilityKeys,
} from "../domain/capability-key.js";
import { normalizeCapabilityProvenance } from "../domain/capability-provenance.js";
import {
  normalizeModuleSlug,
  normalizeModuleSlugSet,
} from "../domain/module-slug.js";
import {
  PLATFORM_RUNTIME_MODULE_SLUGS,
  isPlatformRuntimeModuleSlug,
} from "../domain/platform-module-slugs.js";
import type { CapabilityRepository } from "../ports/index.js";

export type RuntimeAuthorizationStartupDiagnostic = {
  level: "info" | "error";
  code: string;
  message: string;
  detail?: Record<string, unknown>;
};

export type ValidateRuntimeAuthorizationStartupInput = {
  configuratorUrl: string;
  masterDataUrl: string;
  capabilityRepository: CapabilityRepository;
};

export type ValidateRuntimeAuthorizationStartupResult = {
  ok: boolean;
  diagnostics: RuntimeAuthorizationStartupDiagnostic[];
};

function requireNonEmptyUrl(
  diagnostics: RuntimeAuthorizationStartupDiagnostic[],
  envKey: string,
  value: string,
): boolean {
  if (value.trim().length === 0) {
    diagnostics.push({
      level: "error",
      code: `${envKey}_MISSING`,
      message: `${envKey} is required for tenant entitlement and module catalog integration`,
    });
    return false;
  }
  return true;
}

/**
 * Fail-fast startup checks for runtime authorization invariants.
 */
export async function validateRuntimeAuthorizationStartup(
  input: ValidateRuntimeAuthorizationStartupInput,
): Promise<ValidateRuntimeAuthorizationStartupResult> {
  const diagnostics: RuntimeAuthorizationStartupDiagnostic[] = [];

  const configuratorOk = requireNonEmptyUrl(
    diagnostics,
    "CONFIGURATOR_URL",
    input.configuratorUrl,
  );
  const masterDataOk = requireNonEmptyUrl(diagnostics, "MASTER_DATA_URL", input.masterDataUrl);

  const platformSlugs = normalizeModuleSlugSet([...PLATFORM_RUNTIME_MODULE_SLUGS]);
  if (platformSlugs.length !== PLATFORM_RUNTIME_MODULE_SLUGS.length) {
    diagnostics.push({
      level: "error",
      code: "PLATFORM_RUNTIME_MODULE_SLUGS_DUPLICATE",
      message: "PLATFORM_RUNTIME_MODULE_SLUGS contains duplicate normalized slugs",
      detail: { slugs: platformSlugs },
    });
  }

  for (const slug of PLATFORM_RUNTIME_MODULE_SLUGS) {
    if (!isPlatformRuntimeModuleSlug(slug)) {
      diagnostics.push({
        level: "error",
        code: "PLATFORM_RUNTIME_MODULE_SLUG_INVALID",
        message: `Platform runtime module slug is invalid: ${slug}`,
      });
    }
  }

  diagnostics.push({
    level: "info",
    code: "PLATFORM_RUNTIME_MODULE_SLUGS_OK",
    message: "Platform runtime module slugs validated",
    detail: { slugs: [...PLATFORM_RUNTIME_MODULE_SLUGS] },
  });

  const capabilities = await input.capabilityRepository.listCapabilities();
  const moduleSlugCounts = new Map<string, number>();

  const duplicateKeys = findDuplicateCapabilityKeys(capabilities);
  if (duplicateKeys.length > 0) {
    diagnostics.push({
      level: "error",
      code: "CAPABILITY_KEY_DUPLICATE",
      message: "Duplicate normalized capability_key values in runtime catalog",
      detail: { capability_keys: duplicateKeys },
    });
  }

  for (const capability of capabilities) {
    if (!capability.is_active) {
      continue;
    }
    try {
      assertValidRuntimeCapabilityRow(capability, `capabilities.id=${capability.id}`);
      normalizeCapabilityProvenance({
        source_module_slug: capability.source_module_slug,
        source_permission_slug: capability.source_permission_slug,
        source_catalog: capability.source_catalog,
      });
    } catch (err) {
      diagnostics.push({
        level: "error",
        code: "CAPABILITY_CATALOG_INVALID",
        message: `Capability ${capability.id} failed runtime vocabulary validation`,
        detail: {
          capability_key: capability.capability_key,
          module: capability.module,
          error: err instanceof Error ? err.message : String(err),
        },
      });
    }

    const normalized = normalizeModuleSlug(capability.module);
    moduleSlugCounts.set(normalized, (moduleSlugCounts.get(normalized) ?? 0) + 1);
  }

  diagnostics.push({
    level: "info",
    code: "CAPABILITY_CATALOG_SCANNED",
    message: "Runtime capability catalog scanned for module slug and provenance integrity",
    detail: { capabilityCount: capabilities.length, distinctModules: moduleSlugCounts.size },
  });

  const ok =
    configuratorOk &&
    masterDataOk &&
    diagnostics.every((entry) => entry.level !== "error");

  return { ok, diagnostics };
}

export function formatRuntimeAuthorizationStartupFailure(
  diagnostics: RuntimeAuthorizationStartupDiagnostic[],
): string {
  return diagnostics
    .filter((entry) => entry.level === "error")
    .map((entry) => `${entry.code}: ${entry.message}`)
    .join("; ");
}
