import { LinkTokenNotAvailable } from "../../lib/link-token-cache.js";
import { abdmWarn } from "../../lib/abdm-adapter-log.js";
import { resolveM2PatientProfile } from "../../lib/resolve-m2-patient-profile.js";
import type { AbdmTenantInput, AbdmAdapterDeps } from "../../../ports.js";
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
      const message =
        e instanceof LinkTokenNotAvailable
          ? e.message
          : e instanceof Error
            ? e.message
            : String(e);
      result.errors.push({ step: "hip-initiated-link", hiType, message });
      abdmWarn("abdm.m2.orchestrate.hip_link_failed", {
        iqTenantId: input.iqTenantId,
        patientId: input.patientId,
        hiType,
        message,
      });
    }
  }

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
      const message = e instanceof Error ? e.message : String(e);
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

  return result;
}
