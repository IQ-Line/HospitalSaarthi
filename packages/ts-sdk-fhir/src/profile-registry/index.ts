/**
 * NRCeS profile registry.
 *
 * Single source of truth for which NRCeS R4 ImplementationGuide profiles the
 * platform produces, and which version of each is pinned. Upgrading a profile
 * is one PR here plus regenerated test fixtures.
 *
 * Canonical URLs follow the NRCeS pattern:
 *   `https://nrces.in/ndhm/fhir/r4/StructureDefinition/<ProfileName>`
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 * @see https://nrces.in/ndhm/fhir/r4/index.html
 */

export interface NrcesProfile {
  readonly canonicalUrl: string;
  readonly version: string;
}

export const NRCeS_PROFILES = {
  OpConsultRecord: {
    canonicalUrl: 'https://nrces.in/ndhm/fhir/r4/StructureDefinition/OPConsultRecord',
    version: '2.0.0',
  },
  Prescription: {
    canonicalUrl: 'https://nrces.in/ndhm/fhir/r4/StructureDefinition/PrescriptionRecord',
    version: '2.0.0',
  },
  DischargeSummary: {
    canonicalUrl: 'https://nrces.in/ndhm/fhir/r4/StructureDefinition/DischargeSummaryRecord',
    version: '2.0.0',
  },
  DiagnosticReport: {
    canonicalUrl: 'https://nrces.in/ndhm/fhir/r4/StructureDefinition/DiagnosticReportRecord',
    version: '2.0.0',
  },
  HealthDocumentRecord: {
    canonicalUrl: 'https://nrces.in/ndhm/fhir/r4/StructureDefinition/HealthDocumentRecord',
    version: '2.0.0',
  },
  ImmunizationRecord: {
    canonicalUrl: 'https://nrces.in/ndhm/fhir/r4/StructureDefinition/ImmunizationRecord',
    version: '2.0.0',
  },
  WellnessRecord: {
    canonicalUrl: 'https://nrces.in/ndhm/fhir/r4/StructureDefinition/WellnessRecord',
    version: '2.0.0',
  },
} as const satisfies Record<string, NrcesProfile>;

export type NrcesProfileName = keyof typeof NRCeS_PROFILES;

/**
 * Canonical NRCeS profile URL → bundle-type name (the profile's last path segment,
 * e.g. `OPConsultRecord`). Derived from {@link NRCeS_PROFILES} so adding a profile
 * to the registry automatically extends the mapping — a single source of truth for
 * the "which health-record kind is this bundle" rule shared by the integration-hub
 * backend (bundle-for-display) and the web consent-list view. See OM17 dedup.
 */
export const NRCeS_PROFILE_BUNDLE_TYPES: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(
    Object.values(NRCeS_PROFILES).map((profile) => {
      const segments = profile.canonicalUrl.split('/');
      return [profile.canonicalUrl, segments[segments.length - 1] ?? profile.canonicalUrl];
    }),
  ),
);

/**
 * Resolves a bundle-type name from a declared profile URL. NRCeS profiles are often
 * version-pinned (`.../OPConsultRecord|6.5.0`); the version suffix is stripped before
 * lookup. Returns `undefined` when the URL is empty or not a known NRCeS profile.
 */
export function resolveNrcesBundleType(profileUrl: string | undefined): string | undefined {
  if (!profileUrl?.trim()) return undefined;
  const trimmed = profileUrl.trim();
  const base = trimmed.split('|')[0] ?? trimmed;
  return NRCeS_PROFILE_BUNDLE_TYPES[base];
}

/**
 * First `meta.profile[0]` URL declared on a FHIR resource or bundle node, if any.
 * Accepts `unknown` so callers can pass a raw parsed JSON node without a cast.
 */
export function firstProfileUrl(node: unknown): string | undefined {
  if (!node || typeof node !== 'object') return undefined;
  const meta = (node as Record<string, unknown>)['meta'];
  const profile =
    meta && typeof meta === 'object' ? (meta as Record<string, unknown>)['profile'] : undefined;
  return Array.isArray(profile) && typeof profile[0] === 'string' ? profile[0] : undefined;
}
