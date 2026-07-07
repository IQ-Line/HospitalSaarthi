import type { AbdmTenantInput, AbdmAdapterDeps } from "../../../ports.js";
import { extractAttachmentContent } from "../../../lib/fhir-bundle-display.js";
import { isConsentHealthDataAccessible, loadArtefactDataPushed } from "./search-consent-requests.js";

export interface GetM3AttachmentInput {
  sessionId: string;
  bundleId: string;
  num: number;
}

export interface GetM3AttachmentResult {
  attachment: {
    title: string;
    contentType: string;
    content: string;
  };
}

/**
 * Whether a data-pushed entry's bundle id matches `bundleId`. The bundle id is the
 * FHIR `id`, else `identifier.value`, else the entry's careContextReference. On unparseable
 * content, falls back to matching the careContextReference alone.
 */
function entryContentMatchesBundle(
  content: string,
  careContextReference: string | undefined,
  bundleId: string,
): boolean {
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const identifier = parsed["identifier"];
    const identifierValue =
      typeof identifier === "object" &&
      identifier !== null &&
      typeof (identifier as Record<string, unknown>)["value"] === "string"
        ? String((identifier as Record<string, unknown>)["value"])
        : null;
    const id =
      (typeof parsed["id"] === "string" && parsed["id"]) ||
      identifierValue ||
      careContextReference;
    return id === bundleId;
  } catch {
    return careContextReference === bundleId;
  }
}

async function findEntryContent(
  deps: AbdmAdapterDeps,
  input: AbdmTenantInput<GetM3AttachmentInput>,
): Promise<string | null> {
  const consentRow = await deps.m3ConsentRequests.findBySessionId({
    iqTenantId: input.iqTenantId,
    sessionId: input.sessionId,
  });
  if (!consentRow) return null;
  if (!isConsentHealthDataAccessible(consentRow)) return null;

  const artefacts = await deps.m3ConsentArtefactsHiu.listForRequest(
    input.iqTenantId,
    consentRow.consentRequestId,
  );

  for (const artefact of artefacts) {
    const transfer = await deps.m3DataTransfers.findLatestByConsentId(
      input.iqTenantId,
      artefact.consentId,
    );
    const dataPushed = await loadArtefactDataPushed(deps, {
      iqTenantId: input.iqTenantId,
      row: consentRow,
      artefact,
      transfer: transfer ? { bundleJson: transfer.bundleJson } : undefined,
    });

    for (const entry of dataPushed?.entries ?? []) {
      const content = entry.content ?? "";
      if (!content) continue;
      if (entryContentMatchesBundle(content, entry.careContextReference, input.bundleId)) {
        return content;
      }
    }
  }

  return null;
}

export async function getM3Attachment(
  input: AbdmTenantInput<GetM3AttachmentInput>,
  deps: AbdmAdapterDeps,
): Promise<GetM3AttachmentResult | null> {
  const content = await findEntryContent(deps, input);
  if (!content) return null;

  const attachment = extractAttachmentContent(content, input.num);
  if (!attachment) return null;

  return {
    attachment: {
      title: attachment.title,
      contentType: attachment.contentType,
      content: attachment.content,
    },
  };
}
