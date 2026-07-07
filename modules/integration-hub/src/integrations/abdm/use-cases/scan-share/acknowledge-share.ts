/**
 * Emit the ABDM `on-share` acknowledgement back to the CM after a walk-in scans
 * the desk QR. `errorStatus` returns the "token already generated" branch used
 * for the dedupe path. Ported verbatim from the legacy handler so the gateway
 * contract (paths, bearer session per environment, X-CM-ID) is unchanged.
 */

import type { GatewayClient } from "../../ports.js";
import { abdmWarn } from "../../lib/abdm-adapter-log.js";
import { AbdmGatewayError } from "../../lib/gateway-errors.js";

/** Token TTL echoed to NHA in on-share ack (seconds) — matches legacy abdi-lims-backed. */
const ON_SHARE_PROFILE_EXPIRY_SEC = 1800;

export async function acknowledgeShare(input: {
  gateway: GatewayClient;
  requestId: string;
  abhaAddress: string;
  tokenNumber: number;
  counterContext: string;
  xCmId: string;
  gatewayEnvironment: "sandbox" | "production";
  errorStatus?: boolean;
}): Promise<void> {
  const counterId = String(Number(input.counterContext) || 1);
  const body = input.errorStatus
    ? {
        error: {
          code: "ABDM-9999: ",
          message: "Token Already generated for the patient",
        },
        response: { requestId: input.requestId },
      }
    : {
        acknowledgement: {
          abhaAddress: input.abhaAddress,
          status: "SUCCESS",
          profile: {
            context: counterId,
            tokenNumber: String(input.tokenNumber),
            expiry: String(ON_SHARE_PROFILE_EXPIRY_SEC),
          },
        },
        response: { requestId: input.requestId },
      };
  try {
    // Sandbox: legacy abdi-lims uses /gateway/v0.5/sessions for on-share (mileStoneNumber=1).
    // Production (ABHA_LIVE): legacy uses /api/hiecm/gateway/v3/sessions — same as M2.
    const bearerSession = input.gatewayEnvironment === "production" ? "v3" : "v0.5";
    input.gateway.invalidateBearer();
    await input.gateway.post({
      path: "/api/hiecm/patient-share/v3/on-share",
      body,
      target: "gateway",
      bearerSession,
      headers: { "X-CM-ID": input.xCmId },
    });
  } catch (e) {
    if (e instanceof AbdmGatewayError) {
      abdmWarn("abdm.scan_share.on_share_failed", {
        statusCode: e.statusCode,
        abdmCode: typeof e.abdmCode === "string" ? e.abdmCode : undefined,
        requestId: input.requestId,
        abhaAddress: input.abhaAddress,
        counterContext: input.counterContext,
        message: e.message,
        responseBody:
          e.responseBody !== undefined ? JSON.stringify(e.responseBody).slice(0, 500) : undefined,
      });
    }
    throw e;
  }
}
