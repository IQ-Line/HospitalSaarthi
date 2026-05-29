import type { ConsentArtefactRow, M3ConsentArtefactHiuRow } from "../ports.js";

function refsFromUnknownContexts(
  contexts: unknown,
): string[] {
  if (!Array.isArray(contexts)) return [];
  const refs: string[] = [];
  for (const item of contexts) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const ref = String(
      row.careContextReference ?? row.referenceNumber ?? row.careContext ?? "",
    ).trim();
    if (ref) refs.push(ref);
  }
  return refs;
}

/** Care context refs granted in consent — required for PHR push (ABDM-7727). */
export function extractConsentCareContextRefs(input: {
  m3Artefact: M3ConsentArtefactHiuRow | null;
  consentArtefact: ConsentArtefactRow | null;
}): string[] {
  const fromM3 = input.m3Artefact?.careContexts
    .map((c) => c.careContextReference.trim())
    .filter((ref) => ref.length > 0);
  if (fromM3 && fromM3.length > 0) return fromM3;

  const json = input.consentArtefact?.artefactJson;
  if (!json) return [];

  const root = json as {
    consentDetail?: { careContexts?: unknown };
    notification?: { consentDetail?: { careContexts?: unknown } };
    consent?: { consentDetail?: { careContexts?: unknown } };
  };

  return [
    ...refsFromUnknownContexts(root.consentDetail?.careContexts),
    ...refsFromUnknownContexts(root.notification?.consentDetail?.careContexts),
    ...refsFromUnknownContexts(root.consent?.consentDetail?.careContexts),
  ].filter((ref, i, arr) => arr.indexOf(ref) === i);
}
