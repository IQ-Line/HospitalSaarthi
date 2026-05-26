import type {
  CareContextRepo,
  BundleManifestRepo,
  BundleStorageRepo,
} from "../ports.js";
import type { CareContext } from "../domain/care-context.js";
import type {
  DisclosureRequest,
  DisclosureEntry,
  DisclosureResponse,
} from "../domain/disclosure.js";

interface Deps {
  careContextRepo: CareContextRepo;
  bundleManifestRepo: BundleManifestRepo;
  bundleStorageRepo: BundleStorageRepo;
}

const hiTypeToBundleKind = new Map<string, string>([
  ["OPCONSULTATION", "OpConsultRecord"],
  ["PRESCRIPTION", "Prescription"],
  ["DISCHARGE_SUMMARY", "DischargeSummary"],
  ["DIAGNOSTIC_REPORT", "DiagnosticReport"],
  ["HEALTH_DOCUMENT", "HealthDocumentRecord"],
  ["IMMUNIZATION", "ImmunizationRecord"],
  ["WELLNESS_RECORD", "WellnessRecord"],
]);

function isContextExcluded(
  ctx: CareContext,
  fromDate: Date,
  toDate: Date,
  contextIds: Set<string> | null,
): DisclosureResponse["excluded"][number] | null {
  if (contextIds && !contextIds.has(ctx.id)) return null;
  if (!ctx.consent_disclosable) {
    return { care_context_id: ctx.id, reason: "not_disclosable" };
  }
  if (ctx.period_start < fromDate || ctx.period_start > toDate) {
    return { care_context_id: ctx.id, reason: "outside_date_range" };
  }
  return null;
}

async function resolveBundleEntries(
  deps: Deps,
  tenantId: string,
  ctx: CareContext,
  consentedBundleKinds: Set<string>,
  entries: DisclosureEntry[],
): Promise<boolean> {
  const manifests = await deps.bundleManifestRepo.findByCareContext(tenantId, ctx.id);
  const matching = manifests.filter(
    (m) => consentedBundleKinds.has(m.bundle_kind) && m.validation_status === "valid",
  );
  if (matching.length === 0) return false;

  for (const manifest of matching) {
    const data = await deps.bundleStorageRepo.findById(tenantId, manifest.bundle_storage_id);
    if (!data) continue;
    entries.push({
      careContextReference: manifest.id,
      content: data.bundleJson,
      media: "application/fhir+json",
    });
  }
  return true;
}

export async function evaluateDisclosure(
  deps: Deps,
  tenantId: string,
  request: DisclosureRequest,
): Promise<DisclosureResponse> {
  const { data: allContexts } = await deps.careContextRepo.findAll(tenantId, {
    patient_id: request.patient_id,
    abha_linkage_status: "linked",
  });

  const consentedBundleKinds = new Set(
    request.hi_types.map((ht) => hiTypeToBundleKind.get(ht)).filter(Boolean),
  );

  const fromDate = new Date(request.date_range.from);
  const toDate = new Date(request.date_range.to);
  const contextIds = request.care_context_ids ? new Set(request.care_context_ids) : null;

  const entries: DisclosureEntry[] = [];
  const excluded: DisclosureResponse["excluded"] = [];

  for (const ctx of allContexts) {
    const exclusion = isContextExcluded(ctx, fromDate, toDate, contextIds);
    if (exclusion) {
      excluded.push(exclusion);
      continue;
    }

    const found = await resolveBundleEntries(deps, tenantId, ctx, consentedBundleKinds, entries);
    if (!found) {
      excluded.push({ care_context_id: ctx.id, reason: "hi_type_mismatch" });
    }
  }

  return { bundles: entries, excluded };
}
