import type { AbdmAdapterDeps } from "../../../ports.js";
import { abdmWarn } from "../../../lib/abdm-adapter-log.js";
import { filterDataPushedEntry } from "../../../lib/fhir-hi-type-filter.js";
import { parseFhirBundleForDisplay } from "../../../lib/fhir-bundle-display.js";
import {
  collectLocalBundlesForM3Consent,
  extractPatientIdsFromConsentCareContexts,
  isSameHip,
  listAllLocalBundlesForAbha,
} from "../../../lib/resolve-rf-bundles.js";
import type { ConsentListDataPushed } from "./search-consent-requests.js";

function pickBundlesForConsent(
  allLocal: Awaited<ReturnType<typeof listAllLocalBundlesForAbha>>,
  careContextReferences: string[],
): typeof allLocal {
  const consentRefSet = new Set(
    careContextReferences.map((ref) => ref.trim()).filter(Boolean),
  );
  if (!consentRefSet.size) return allLocal;
  const matched = allLocal.filter((bundle) =>
    consentRefSet.has(bundle.careContextReference),
  );
  return matched.length > 0 ? matched : allLocal;
}

/** When M3 HIP push has not completed, surface local Record Foundation bundles for tenant HIP. */
export async function hydrateArtefactDataFromRecordFoundation(
  deps: AbdmAdapterDeps,
  input: {
    iqTenantId: string;
    tenantHipId: string;
    artefactHipId: string;
    patientAbhaAddress: string;
    sessionId: string;
    careContextReferences?: string[];
    consentCareContexts?: Array<{ patientReference?: string; careContextReference?: string }>;
    extraPatientIds?: string[];
    hiTypes?: string[];
  },
): Promise<ConsentListDataPushed | undefined> {
  const sameHip = isSameHip(input.artefactHipId, input.tenantHipId);
  if (!sameHip) {
    abdmWarn("abdm.m3.hiu_hydrate.hip_mismatch", {
      artefactHipId: input.artefactHipId,
      tenantHipId: input.tenantHipId,
    });
  }

  const careContextReferences = input.careContextReferences ?? [];
  const consentPatientIds = extractPatientIdsFromConsentCareContexts(
    input.consentCareContexts ?? [],
  );
  const extraPatientIds = [
    ...(input.extraPatientIds ?? []),
    ...consentPatientIds,
  ];
  const allLocal = await listAllLocalBundlesForAbha(deps, {
    iqTenantId: input.iqTenantId,
    abhaAddress: input.patientAbhaAddress,
    extraPatientIds,
  });

  let localBundles = pickBundlesForConsent(allLocal, careContextReferences);

  if (!localBundles.length) {
    localBundles = await collectLocalBundlesForM3Consent(deps, {
      iqTenantId: input.iqTenantId,
      patientAbhaAddress: input.patientAbhaAddress,
      careContextReferences,
      extraPatientIds,
    });
  }

  if (!localBundles.length) return undefined;

  const sessionHiTypes = input.hiTypes ?? [];
  const entries = localBundles
    .map((bundle) => {
      const ref = bundle.careContextReference;
      const display = parseFhirBundleForDisplay(bundle.contentJson, {
        sessionId: input.sessionId,
        careContextReference: ref,
      });
      return {
        id: display.id,
        ...(ref ? { careContextReference: ref } : {}),
        content: bundle.contentJson,
        bundleType: display.bundleType,
        CompositionInfo: display.CompositionInfo,
        AttachmentRefs: display.AttachmentRefs?.map((a) => ({
          ...a,
          sessionId: input.sessionId,
          bundleId: display.id,
        })),
      };
    })
    .filter((entry) => filterDataPushedEntry(entry, sessionHiTypes));

  if (!entries.length) return undefined;

  return { entries };
}
