import type {
  AbdmAdapterDeps,
  AbdmTenantInput,
  M3ConsentArtefactHiuRow,
  M3ConsentRequestRow,
} from "../../../ports.js";
import { M3Hiu } from "../../../lib/m3-fsm-states.js";
import { filterDataPushedEntry } from "../../../lib/fhir-hi-type-filter.js";
import { parseFhirBundleForDisplay } from "../../../lib/fhir-bundle-display.js";
import { hydrateArtefactDataFromRecordFoundation } from "./hydrate-artefact-data-pushed.js";
import { extractPatientIdsFromConsentCareContexts } from "../../../lib/resolve-rf-bundles.js";

const PURPOSE_TEXT: Record<string, string> = {
  CAREMGT: "Care Management",
  BTG: "Break the Glass",
  PUBHLTH: "Public Health",
  HPAYMT: "Healthcare Payment",
  DSRCH: "Disease Specific Healthcare Research",
  PATRQT: "Self Requested",
};

const GRANTED_STATES = new Set<string>([
  M3Hiu.CONSENT_GRANTED,
  M3Hiu.DATA_REQUESTED,
  M3Hiu.AWAITING_PUSH,
  M3Hiu.BUNDLES_RECEIVED,
  M3Hiu.BUNDLES_DECRYPTED,
  M3Hiu.RECORDS_INGESTED,
  M3Hiu.ACKNOWLEDGED,
]);

export interface SearchConsentRequestsInput {
  name?: string;
  from?: string;
  to?: string;
  drName?: string;
  hiTypes?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface ConsentListDataPushedEntry {
  id: string;
  careContextReference?: string;
  content: string;
  bundleType?: string;
  CompositionInfo?: Array<{ title?: string }>;
  AttachmentRefs?: Array<{
    title?: string;
    refId: string;
    bundleId: string;
    sessionId: string;
    num: number;
    contentType?: string;
  }>;
}

export interface ConsentListDataPushed {
  transactionId?: string;
  entries: ConsentListDataPushedEntry[];
}

export interface ConsentListArtifact {
  consentId: string;
  hipId: string;
  hipName?: string;
  status: string;
  /** Legacy: "REQUESTED" on artefact means HIP acknowledged the data request. */
  sessionStatus?: string;
  hiTypes: string[];
  careContexts: Array<{ patientReference: string; careContextReference: string }>;
  transferId?: string;
  dataPushed?: ConsentListDataPushed;
  grantedAt?: string;
}

export interface ConsentListSession {
  sessionId: string;
  consentRequestId: string;
  status: "REQUESTED" | "GRANTED" | "DENIED" | "EXPIRED" | "REVOKED";
  drName: string;
  identifiers: {
    name: string;
    abha_address: string;
    abha_number?: string;
  };
  fromDate: string;
  toDate: string;
  dataEraseAt: string;
  hiTypes: string[];
  purpose: { code: string; text: string };
  consentArtifacts: ConsentListArtifact[];
  createdAt: string;
  updatedAt: string;
  grantedAt?: string;
  _consentStatusTimestamps?: {
    REQUESTED?: string;
    GRANTED?: string;
  };
}

export interface SearchConsentRequestsResult {
  sessions: ConsentListSession[];
  page: number;
  limit: number;
  totalCount: number;
}

function parseDateBoundary(value: string | undefined, endOfDay: boolean): Date | undefined {
  if (!value?.trim()) return undefined;
  const d = new Date(`${value.trim()}T00:00:00`);
  if (Number.isNaN(d.getTime())) return undefined;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  return d;
}

export function toDisplayStatus(row: M3ConsentRequestRow): ConsentListSession["status"] {
  const errorCode =
    typeof row.context.error === "object" &&
    row.context.error !== null &&
    "code" in row.context.error
      ? String((row.context.error as { code?: string }).code ?? "")
      : "";

  if (row.state === M3Hiu.CONSENT_DENIED) {
    return errorCode === "REVOKED" ? "REVOKED" : "DENIED";
  }
  if (row.state === M3Hiu.EXPIRED) return "EXPIRED";
  if (row.dataEraseAt.getTime() < Date.now()) {
    return "EXPIRED";
  }
  if (
    row.state === M3Hiu.CONSENT_INIT_REQUESTED ||
    row.state === M3Hiu.AWAITING_PATIENT_APPROVAL
  ) {
    return "REQUESTED";
  }
  if (GRANTED_STATES.has(row.state)) return "GRANTED";
  return "REQUESTED";
}

/** Health records / attachments are only served while consent is actively granted. */
export function isConsentHealthDataAccessible(row: M3ConsentRequestRow): boolean {
  return toDisplayStatus(row) === "GRANTED";
}

function hasTransferBundleEntries(bundleJson: Record<string, unknown> | null | undefined): boolean {
  if (!bundleJson || typeof bundleJson !== "object") return false;
  const entries = bundleJson["entries"];
  return Array.isArray(entries) && entries.length > 0;
}

function mapDataPushed(
  bundleJson: Record<string, unknown> | null | undefined,
  consentId: string,
  sessionId: string,
  sessionHiTypes: string[],
): ConsentListDataPushed | undefined {
  if (!hasTransferBundleEntries(bundleJson)) return undefined;
  const entries = bundleJson!["entries"] as Array<{
    content?: string;
    careContextReference?: string;
  }>;
  return {
    transactionId:
      typeof bundleJson!["transactionId"] === "string"
        ? bundleJson!["transactionId"]
        : undefined,
    entries: entries
      .map((entry, index) => {
      const careRef = entry.careContextReference;
      const display = parseFhirBundleForDisplay(entry.content ?? "", {
        sessionId,
        careContextReference: careRef,
      });
      return {
        id: careRef ?? display.id ?? `${consentId}-${index}`,
        ...(careRef ? { careContextReference: careRef } : {}),
        content: entry.content ?? "",
        ...(display.bundleType ? { bundleType: display.bundleType } : {}),
        ...(display.CompositionInfo ? { CompositionInfo: display.CompositionInfo } : {}),
        ...(display.AttachmentRefs?.length
          ? {
              AttachmentRefs: display.AttachmentRefs.map((a) => ({
                ...a,
                sessionId,
                bundleId: display.id,
              })),
            }
          : {}),
      };
    })
      .filter((entry) => filterDataPushedEntry(entry, sessionHiTypes)),
  };
}

function deriveArtifactSessionStatus(transferState?: string): string | undefined {
  if (!transferState || transferState === M3Hiu.DATA_REQUESTED) return undefined;
  if (transferState === M3Hiu.EXPIRED) return "FAILED";
  return "REQUESTED";
}

function mapArtifact(
  artefact: M3ConsentArtefactHiuRow,
  sessionId: string,
  sessionHiTypes: string[],
  transfer?: { transferId: string; state: string; bundleJson: Record<string, unknown> | null },
): ConsentListArtifact {
  const hipName =
    typeof artefact.artefactJson.consentDetail === "object" &&
    artefact.artefactJson.consentDetail !== null &&
    typeof (artefact.artefactJson.consentDetail as { hip?: { name?: string } }).hip?.name ===
      "string"
      ? (artefact.artefactJson.consentDetail as { hip: { name: string } }).hip.name
      : undefined;

  return {
    consentId: artefact.consentId,
    hipId: artefact.hipId,
    hipName,
    status: artefact.status,
    ...(transfer?.state
      ? { sessionStatus: deriveArtifactSessionStatus(transfer.state) }
      : {}),
    hiTypes: artefact.hiTypes,
    careContexts: artefact.careContexts,
    grantedAt: artefact.grantedAt.toISOString(),
    ...(transfer?.transferId ? { transferId: transfer.transferId } : {}),
    ...(() => {
      const dataPushed = transfer?.bundleJson
        ? mapDataPushed(transfer.bundleJson, artefact.consentId, sessionId, sessionHiTypes)
        : undefined;
      return dataPushed ? { dataPushed } : {};
    })(),
  };
}

/** Resolve pushed transfer bundles or local Record Foundation fallback (lazy detail path). */
export async function loadArtefactDataPushed(
  deps: AbdmAdapterDeps,
  input: {
    iqTenantId: string;
    row: M3ConsentRequestRow;
    artefact: M3ConsentArtefactHiuRow;
    transfer?: { bundleJson: Record<string, unknown> | null };
  },
): Promise<ConsentListDataPushed | undefined> {
  const fromTransfer = input.transfer?.bundleJson
    ? mapDataPushed(
        input.transfer.bundleJson,
        input.artefact.consentId,
        input.row.sessionId,
        input.row.hiTypes,
      )
    : undefined;
  if (fromTransfer?.entries?.length) return fromTransfer;

  const contextPatientId =
    typeof input.row.context.patientId === "string" ? input.row.context.patientId.trim() : "";
  const linkedConsent = await deps.consentArtefacts.findById(
    input.iqTenantId,
    input.artefact.consentId,
  );
  const extraPatientIds = [
    contextPatientId,
    linkedConsent?.patientId?.trim() ?? "",
    ...extractPatientIdsFromConsentCareContexts(input.artefact.careContexts),
  ].filter(Boolean);

  return hydrateArtefactDataFromRecordFoundation(deps, {
    iqTenantId: input.iqTenantId,
    tenantHipId: deps.xHipId,
    artefactHipId: input.artefact.hipId,
    patientAbhaAddress: input.row.patientAbhaAddress,
    sessionId: input.row.sessionId,
    careContextReferences: input.artefact.careContexts.map((c) => c.careContextReference),
    consentCareContexts: input.artefact.careContexts,
    extraPatientIds,
    hiTypes: input.row.hiTypes,
  });
}

function mapRow(
  row: M3ConsentRequestRow,
  artefacts: ConsentListArtifact[],
): ConsentListSession {
  const ctx = row.context;
  const displayStatus = toDisplayStatus(row);
  const grantedAt =
    displayStatus === "GRANTED"
      ? (artefacts.find((a) => a.grantedAt)?.grantedAt ?? row.updatedAt.toISOString())
      : undefined;
  return {
    sessionId: row.sessionId,
    consentRequestId: row.consentRequestId,
    status: displayStatus,
    drName: typeof ctx.requesterName === "string" ? ctx.requesterName : "",
    identifiers: {
      name: typeof ctx.patientName === "string" ? ctx.patientName : "",
      abha_address: row.patientAbhaAddress,
      ...(typeof ctx.patientAbhaNumber === "string"
        ? { abha_number: ctx.patientAbhaNumber }
        : {}),
    },
    fromDate: row.permissionDateFrom.toISOString(),
    toDate: row.permissionDateTo.toISOString(),
    dataEraseAt: row.dataEraseAt.toISOString(),
    hiTypes: row.hiTypes,
    purpose: {
      code: row.purposeCode,
      text: PURPOSE_TEXT[row.purposeCode] ?? row.purposeCode,
    },
    consentArtifacts: artefacts,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...(grantedAt ? { grantedAt } : {}),
    _consentStatusTimestamps: {
      REQUESTED: row.createdAt.toISOString(),
      ...(grantedAt ? { GRANTED: grantedAt } : {}),
    },
  };
}

export async function searchConsentRequests(
  input: AbdmTenantInput<SearchConsentRequestsInput>,
  deps: AbdmAdapterDeps,
): Promise<SearchConsentRequestsResult> {
  const page = Math.max(1, input.page ?? 1);
  const limit = Math.min(50, Math.max(1, input.limit ?? 10));

  const { rows, totalCount } = await deps.m3ConsentRequests.searchForTenant({
    iqTenantId: input.iqTenantId,
    name: input.name,
    from: parseDateBoundary(input.from, false),
    to: parseDateBoundary(input.to, true),
    drName: input.drName,
    hiTypes: input.hiTypes?.trim() ? [input.hiTypes.trim()] : undefined,
    status: input.status,
    page,
    limit,
  });

  const sessions: ConsentListSession[] = [];
  for (const row of rows) {
    const artefactRows = await deps.m3ConsentArtefactsHiu.listForRequest(
      input.iqTenantId,
      row.consentRequestId,
    );
    const artefacts: ConsentListArtifact[] = [];
    for (const artefact of artefactRows) {
      const transfer = await deps.m3DataTransfers.findLatestByConsentId(
        input.iqTenantId,
        artefact.consentId,
      );
      artefacts.push(
        mapArtifact(
          artefact,
          row.sessionId,
          row.hiTypes,
          transfer
            ? {
                transferId: transfer.transferId,
                state: transfer.state,
                bundleJson: transfer.bundleJson,
              }
            : undefined,
        ),
      );
    }
    sessions.push(mapRow(row, artefacts));
  }

  return { sessions, page, limit, totalCount };
}
