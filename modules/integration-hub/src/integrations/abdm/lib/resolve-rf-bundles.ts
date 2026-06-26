import type { AbdmAdapterDeps, HealthRecordBundleEntry } from "../ports.js";

export function normalizeHipId(hipId: string): string {
  return hipId.trim().toUpperCase();
}

export function isSameHip(a: string, b: string): boolean {
  return normalizeHipId(a) === normalizeHipId(b);
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Consent artefacts carry EMPI patient UUIDs in careContext.patientReference. */
export function extractPatientIdsFromConsentCareContexts(
  careContexts: Array<{ patientReference?: string }>,
): string[] {
  const ids = new Set<string>();
  for (const ctx of careContexts) {
    const ref = ctx.patientReference?.trim() ?? "";
    if (ref && UUID_RE.test(ref)) ids.add(ref);
  }
  return [...ids];
}

export async function resolvePatientIdsForAbha(
  deps: AbdmAdapterDeps,
  iqTenantId: string,
  abhaAddress: string,
  extraPatientIds: string[] = [],
): Promise<string[]> {
  const ids = new Set<string>(extraPatientIds.map((id) => id.trim()).filter(Boolean));

  const empi = await deps.empi.findPatientByAbhaAddress({ iqTenantId, abhaAddress });
  if (empi?.patientId) ids.add(empi.patientId);

  const registrationIds = deps.registration?.findAllPatientIdsByAbhaAddress
    ? await deps.registration.findAllPatientIdsByAbhaAddress({
        iqTenantId,
        abhaAddress,
      })
    : deps.registration?.findPatientIdByAbhaAddress
      ? [
          (await deps.registration.findPatientIdByAbhaAddress({ iqTenantId, abhaAddress })) ??
            "",
        ].filter(Boolean)
      : [];
  for (const patientId of registrationIds) ids.add(patientId);

  return [...ids];
}

export async function listBundlesForCareReference(
  deps: AbdmAdapterDeps,
  input: {
    iqTenantId: string;
    patientIds: string[];
    careRef: string;
  },
): Promise<HealthRecordBundleEntry[]> {
  for (const patientId of input.patientIds) {
    const contexts = await deps.recordFoundation.listCareContexts({
      iqTenantId: input.iqTenantId,
      patientId,
    });
    const match = contexts.find(
      (c) => c.referenceNumber === input.careRef || c.id === input.careRef,
    );
    if (!match) continue;

    const bundles = await deps.recordFoundation.listBundles({
      iqTenantId: input.iqTenantId,
      careContextId: match.id,
    });
    if (bundles.length) {
      return bundles.map((b) => ({
        ...b,
        careContextReference: input.careRef,
      }));
    }
  }

  return [];
}

export async function listAllLocalBundlesForAbha(
  deps: AbdmAdapterDeps,
  input: {
    iqTenantId: string;
    abhaAddress: string;
    extraPatientIds?: string[];
  },
): Promise<HealthRecordBundleEntry[]> {
  const patientIds = await resolvePatientIdsForAbha(
    deps,
    input.iqTenantId,
    input.abhaAddress,
    input.extraPatientIds,
  );
  if (!patientIds.length) return [];

  const collected: HealthRecordBundleEntry[] = [];
  const seen = new Set<string>();

  for (const patientId of patientIds) {
    const contexts = await deps.recordFoundation.listCareContexts({
      iqTenantId: input.iqTenantId,
      patientId,
    });
    for (const ctx of contexts) {
      const ref = ctx.referenceNumber;
      if (seen.has(ref)) continue;
      seen.add(ref);

      const bundles = await deps.recordFoundation.listBundles({
        iqTenantId: input.iqTenantId,
        careContextId: ctx.id,
      });
      for (const bundle of bundles) {
        collected.push({
          ...bundle,
          careContextReference: ref,
        });
      }
    }
  }

  return collected;
}

/** Same resolution path as M3 HIP push — consent refs first, then all local bundles for ABHA. */
export async function collectLocalBundlesForM3Consent(
  deps: AbdmAdapterDeps,
  input: {
    iqTenantId: string;
    patientAbhaAddress: string;
    careContextReferences: string[];
    extraPatientIds?: string[];
  },
): Promise<HealthRecordBundleEntry[]> {
  const abha = input.patientAbhaAddress.trim();
  if (!abha) return [];

  const patientIds = await resolvePatientIdsForAbha(
    deps,
    input.iqTenantId,
    abha,
    input.extraPatientIds,
  );
  const triedRefs = new Set<string>();
  const bundleEntries: HealthRecordBundleEntry[] = [];

  const appendForRef = async (ref: string) => {
    const key = ref.trim();
    if (!key || triedRefs.has(key)) return;
    triedRefs.add(key);
    const bundles = await listBundlesForCareReference(deps, {
      iqTenantId: input.iqTenantId,
      patientIds,
      careRef: key,
    });
    bundleEntries.push(...bundles);
  };

  for (const ref of input.careContextReferences) {
    await appendForRef(ref);
  }

  if (bundleEntries.length === 0) {
    bundleEntries.push(
      ...(await listAllLocalBundlesForAbha(deps, {
        iqTenantId: input.iqTenantId,
        abhaAddress: abha,
        extraPatientIds: input.extraPatientIds,
      })),
    );
  }

  return bundleEntries;
}
