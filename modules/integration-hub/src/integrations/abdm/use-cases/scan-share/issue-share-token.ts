/**
 * Scan-and-share callback business logic: a walk-in scanned the desk QR and the
 * CM pushed their profile to `POST /hip/patient/share`. Dedupe by ABHA within
 * the active window (ack "already generated"), else best-effort EMPI match,
 * allocate the next desk token, and ack success. Ported verbatim from the
 * legacy handler; the only change is that data-access and gateway I/O are
 * injected as `deps` so the flow is unit-testable.
 */

import type { EmpiClient, GatewayClient } from "../../ports.js";
import type { ScanShareRepository } from "./ports.js";
import { parseSharePatient } from "./profile-mapping.js";
import { acknowledgeShare } from "./acknowledge-share.js";
import { activeWindowSince, endOfIstDay, istIssueDate } from "./time.js";

export interface IssueShareTokenDeps {
  repo: ScanShareRepository;
  gateway: GatewayClient;
  empi: EmpiClient;
  now: () => Date;
}

export async function issueShareToken(
  input: {
    iqTenantId: string;
    facilityIdRef: string;
    integrationId: string;
    requestId: string;
    xCmId: string;
    gatewayEnvironment: "sandbox" | "production";
    body: unknown;
  },
  deps: IssueShareTokenDeps,
): Promise<void> {
  const parsed = parseSharePatient(input.body);
  if (!parsed) {
    throw new Error("invalid scan-and-share profile payload");
  }

  const now = deps.now();
  const existing = await deps.repo.findActiveByAbha({
    iqTenantId: input.iqTenantId,
    facilityIdRef: input.facilityIdRef,
    abhaAddress: parsed.abhaAddress,
    since: activeWindowSince(now),
  });
  if (existing) {
    await acknowledgeShare({
      gateway: deps.gateway,
      requestId: input.requestId,
      abhaAddress: parsed.abhaAddress,
      tokenNumber: existing.token_number,
      counterContext: parsed.counterContext,
      xCmId: input.xCmId,
      gatewayEnvironment: input.gatewayEnvironment,
      errorStatus: true,
    });
    return;
  }

  let patientId: string | null;
  try {
    const empiHit = await deps.empi.findPatientByAbhaAddress({
      iqTenantId: input.iqTenantId,
      abhaAddress: parsed.abhaAddress,
    });
    patientId = empiHit?.patientId ?? null;
  } catch {
    patientId = null;
  }

  const issuance = await deps.repo.allocateToken({
    iqTenantId: input.iqTenantId,
    integrationId: input.integrationId,
    facilityIdRef: input.facilityIdRef,
    abhaAddress: parsed.abhaAddress,
    profile: parsed.profile,
    patientId,
    issueDate: istIssueDate(now),
    expiresAt: endOfIstDay(now),
  });

  await acknowledgeShare({
    gateway: deps.gateway,
    requestId: input.requestId,
    abhaAddress: parsed.abhaAddress,
    tokenNumber: issuance.token_number,
    counterContext: parsed.counterContext,
    xCmId: input.xCmId,
    gatewayEnvironment: input.gatewayEnvironment,
  });
}
