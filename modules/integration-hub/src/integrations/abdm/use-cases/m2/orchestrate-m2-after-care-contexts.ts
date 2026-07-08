import { abdmWarn } from "../../lib/abdm-adapter-log.js";
import { resolveM2PatientProfile } from "../../lib/resolve-m2-patient-profile.js";
import type {
  AbdmTenantInput,
  AbdmAdapterDeps,
  M2PatientProfile,
} from "../../ports.js";
import { addContextsPublish } from "./add-contexts/publish.js";
import { hipInitiatedLinkStart } from "./hip-initiated-link/start.js";

export interface M2CareContextInput {
  referenceNumber: string;
  display: string;
  hiType: string;
}

export interface OrchestrateM2AfterCareContextsInput {
  patientId: string;
  careContexts: M2CareContextInput[];
  eventDate?: string;
}

export interface OrchestrateM2AfterCareContextsResult {
  skipped: boolean;
  hipLinkSessions: string[];
  publishSessions: string[];
  errors: Array<{ step: string; hiType?: string; careContextReference?: string; message: string }>;
}

const PUBLISH_DELAY_MS = 2000;
const LINK_WAIT_MS = 15_000;
const LINK_POLL_MS = 500;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHipLinkLinked(
  deps: AbdmAdapterDeps,
  iqTenantId: string,
  sessionId: string,
): Promise<boolean> {
  const deadline = Date.now() + LINK_WAIT_MS;
  while (Date.now() < deadline) {
    const session = await deps.sessions.findById({ iqTenantId, sessionId });
    if (session?.state === "LINKED") return true;
    if (session?.state === "FAILED") return false;
    await delay(LINK_POLL_MS);
  }
  return false;
}

function groupByHiType(
  contexts: M2CareContextInput[],
): Map<string, M2CareContextInput[]> {
  const groups = new Map<string, M2CareContextInput[]>();
  for (const ctx of contexts) {
    const key = ctx.hiType.trim() || "OPCONSULTATION";
    const list = groups.get(key) ?? [];
    list.push(ctx);
    groups.set(key, list);
  }
  return groups;
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

/**
 * Phase 1: HIP-initiated link, one session per HI type. Per-group failures are
 * collected into `result.errors` and do not abort the remaining groups.
 */
async function startHipLinksByHiType(
  input: AbdmTenantInput<OrchestrateM2AfterCareContextsInput>,
  deps: AbdmAdapterDeps,
  profile: M2PatientProfile,
  groups: Map<string, M2CareContextInput[]>,
  result: OrchestrateM2AfterCareContextsResult,
): Promise<void> {
  for (const [hiType, contexts] of groups) {
    try {
      const linkResult = await hipInitiatedLinkStart(
        {
          iqTenantId: input.iqTenantId,
          abhaAddress: profile.abhaAddress,
          abhaNumber: profile.abhaNumber,
          patientName: profile.patientName,
          gender: profile.gender,
          yearOfBirth: profile.yearOfBirth,
          phoneNo: profile.phoneNo,
          patientReference: input.patientId,
          careContexts: contexts.map((c) => ({
            referenceNumber: c.referenceNumber,
            display: c.display,
            hiType: c.hiType,
          })),
        },
        deps,
      );
      result.hipLinkSessions.push(linkResult.sessionId);
    } catch (e) {
      const message = errorMessage(e);
      result.errors.push({ step: "hip-initiated-link", hiType, message });
      abdmWarn("abdm.m2.orchestrate.hip_link_failed", {
        iqTenantId: input.iqTenantId,
        patientId: input.patientId,
        hiType,
        message,
      });
    }
  }
}

/**
 * Phase 3: CM context notify per care context, throttled by PUBLISH_DELAY_MS
 * between attempts. Per-context failures are collected and do not abort the rest.
 */
async function publishCareContexts(
  input: AbdmTenantInput<OrchestrateM2AfterCareContextsInput>,
  deps: AbdmAdapterDeps,
  profile: M2PatientProfile,
  eventDate: string,
  result: OrchestrateM2AfterCareContextsResult,
): Promise<void> {
  let publishIndex = 0;
  for (const ctx of input.careContexts) {
    if (publishIndex > 0) {
      await delay(PUBLISH_DELAY_MS);
    }
    publishIndex += 1;
    try {
      const publishResult = await addContextsPublish(
        {
          iqTenantId: input.iqTenantId,
          abhaAddress: profile.abhaAddress,
          patientReference: input.patientId,
          careContextReference: ctx.referenceNumber,
          hiType: ctx.hiType,
          eventDate,
        },
        deps,
      );
      result.publishSessions.push(publishResult.sessionId);
    } catch (e) {
      const message = errorMessage(e);
      result.errors.push({
        step: "add-contexts-publish",
        careContextReference: ctx.referenceNumber,
        hiType: ctx.hiType,
        message,
      });
      abdmWarn("abdm.m2.orchestrate.publish_failed", {
        iqTenantId: input.iqTenantId,
        patientId: input.patientId,
        careContextReference: ctx.referenceNumber,
        message,
      });
    }
  }
}

/**
 * After consultation bundles / care contexts exist: HIP-initiated link per HI type,
 * then CM context notify per care context (mirrors legacy HIMS post-bundle flow).
 */
export async function orchestrateM2AfterCareContexts(
  input: AbdmTenantInput<OrchestrateM2AfterCareContextsInput>,
  deps: AbdmAdapterDeps,
): Promise<OrchestrateM2AfterCareContextsResult> {
  const result: OrchestrateM2AfterCareContextsResult = {
    skipped: false,
    hipLinkSessions: [],
    publishSessions: [],
    errors: [],
  };

  if (input.careContexts.length === 0) {
    result.skipped = true;
    return result;
  }

  const profile = await resolveM2PatientProfile(deps, {
    iqTenantId: input.iqTenantId,
    patientId: input.patientId,
  });
  if (!profile) {
    result.skipped = true;
    abdmWarn("abdm.m2.orchestrate.skipped_no_profile", {
      iqTenantId: input.iqTenantId,
      patientId: input.patientId,
    });
    return result;
  }

  const eventDate = input.eventDate ?? new Date().toISOString();
  const groups = groupByHiType(input.careContexts);

  await startHipLinksByHiType(input, deps, profile, groups, result);

  if (result.hipLinkSessions.length === 0) {
    return result;
  }

  const linkedFlags = await Promise.all(
    result.hipLinkSessions.map((sessionId) =>
      waitForHipLinkLinked(deps, input.iqTenantId, sessionId),
    ),
  );
  if (!linkedFlags.some(Boolean)) {
    abdmWarn("abdm.m2.orchestrate.add_contexts_skipped_not_linked", {
      iqTenantId: input.iqTenantId,
      patientId: input.patientId,
      hipLinkSessions: result.hipLinkSessions,
    });
    return result;
  }

  await publishCareContexts(input, deps, profile, eventDate, result);

  return result;
}
