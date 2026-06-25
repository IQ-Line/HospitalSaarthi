import type { AbdmTenantInput, AbdmAdapterDeps } from "../../../ports.js";
import { extractAttachmentContent } from "../../../lib/fhir-bundle-display.js";
import { hydrateArtefactDataFromRecordFoundation } from "./hydrate-artefact-data-pushed.js";

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

async function findEntryContent(
  deps: AbdmAdapterDeps,
  input: AbdmTenantInput<GetM3AttachmentInput>,
): Promise<string | null> {
  const consentRow = await deps.m3ConsentRequests.findBySessionId({
    iqTenantId: input.iqTenantId,
    sessionId: input.sessionId,
  });
  if (!consentRow) return null;

  const artefacts = await deps.m3ConsentArtefactsHiu.listForRequest(
    input.iqTenantId,
    consentRow.consentRequestId,
  );

  for (const artefact of artefacts) {
    const transfer = await deps.m3DataTransfers.findLatestByConsentId(
      input.iqTenantId,
      artefact.consentId,
    );
    let entries = transfer?.bundleJson?.["entries"] as
      | Array<{ content?: string; careContextReference?: string }>
      | undefined;

    if (!entries?.length) {
      const contextPatientId =
        typeof consentRow.context.patientId === "string"
          ? consentRow.context.patientId.trim()
          : "";
      const linkedConsent = await deps.consentArtefacts.findById(
        input.iqTenantId,
        artefact.consentId,
      );
      const extraPatientIds = [
        contextPatientId,
        linkedConsent?.patientId?.trim() ?? "",
      ].filter(Boolean);
      const hydrated = await hydrateArtefactDataFromRecordFoundation(deps, {
        iqTenantId: input.iqTenantId,
        tenantHipId: deps.xHipId,
        artefactHipId: artefact.hipId,
        patientAbhaAddress: consentRow.patientAbhaAddress,
        sessionId: input.sessionId,
        careContextReferences: artefact.careContexts.map((c) => c.careContextReference),
        extraPatientIds,
        hiTypes: consentRow.hiTypes,
      });
      entries = hydrated?.entries;
    }

    for (const entry of entries ?? []) {
      const content = entry.content ?? "";
      if (!content) continue;
      try {
        const parsed = JSON.parse(content) as Record<string, unknown>;
        const id =
          (typeof parsed["id"] === "string" && parsed["id"]) ||
          (typeof parsed["identifier"] === "object" &&
          parsed["identifier"] !== null &&
          typeof (parsed["identifier"] as Record<string, unknown>)["value"] === "string"
            ? String((parsed["identifier"] as Record<string, unknown>)["value"])
            : null) ||
          entry.careContextReference;
        if (id === input.bundleId) return content;
      } catch {
        if (entry.careContextReference === input.bundleId) return content;
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
