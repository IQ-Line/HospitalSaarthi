import type {
  AbdmAdapterDeps,
  AbdmTenantInput,
  M3ConsentArtefactHiuRow,
} from "../../../ports.js";
import {
  isConsentHealthDataAccessible,
  loadArtefactDataPushed,
  type ConsentListDataPushed,
} from "./search-consent-requests.js";

export interface GetConsentArtefactRecordsInput {
  sessionId: string;
  consentId?: string;
}

export interface ConsentArtefactRecordItem {
  consentId: string;
  hipId: string;
  hipName?: string;
  dataPushed?: ConsentListDataPushed;
}

export interface GetConsentArtefactRecordsResult {
  sessionId: string;
  artefacts: ConsentArtefactRecordItem[];
}

function artefactHipName(artefact: M3ConsentArtefactHiuRow): string | undefined {
  const detail = artefact.artefactJson.consentDetail;
  if (typeof detail !== "object" || detail === null) return undefined;
  const name = (detail as { hip?: { name?: string } }).hip?.name;
  return typeof name === "string" ? name : undefined;
}

export async function getConsentArtefactRecords(
  input: AbdmTenantInput<GetConsentArtefactRecordsInput>,
  deps: AbdmAdapterDeps,
): Promise<GetConsentArtefactRecordsResult | null> {
  const row = await deps.m3ConsentRequests.findBySessionId({
    iqTenantId: input.iqTenantId,
    sessionId: input.sessionId,
  });
  if (!row || !isConsentHealthDataAccessible(row)) return null;

  const consentId = input.consentId?.trim();
  const artefactRows = await deps.m3ConsentArtefactsHiu.listForRequest(
    input.iqTenantId,
    row.consentRequestId,
  );
  const targets = consentId
    ? artefactRows.filter((artefact) => artefact.consentId === consentId)
    : artefactRows;
  if (consentId && targets.length === 0) return null;

  const artefacts: ConsentArtefactRecordItem[] = [];
  for (const artefact of targets) {
    const transfer = await deps.m3DataTransfers.findLatestByConsentId(
      input.iqTenantId,
      artefact.consentId,
    );
    const dataPushed = await loadArtefactDataPushed(deps, {
      iqTenantId: input.iqTenantId,
      row,
      artefact,
      transfer: transfer ? { bundleJson: transfer.bundleJson } : undefined,
    });
    const hipName = artefactHipName(artefact);
    artefacts.push({
      consentId: artefact.consentId,
      hipId: artefact.hipId,
      ...(hipName ? { hipName } : {}),
      ...(dataPushed ? { dataPushed } : {}),
    });
  }

  return { sessionId: row.sessionId, artefacts };
}
