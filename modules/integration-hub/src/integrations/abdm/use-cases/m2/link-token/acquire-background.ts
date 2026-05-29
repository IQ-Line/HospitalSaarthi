import type { AbdmAdapterDeps } from "../../../ports.js";
import {
  LinkTokenNotAvailable,
  getOrAcquireLinkToken,
} from "../../../lib/link-token-cache.js";
import { abdmWarn } from "../../../lib/abdm-adapter-log.js";
import type { LinkTokenAcquireBody } from "./acquire.js";

/** Completes pre-mint after HTTP 202 TOKEN_REQUESTED response. */
export async function runLinkTokenAcquireBackground(
  input: {
    iqTenantId: string;
    sessionId: string;
    body: LinkTokenAcquireBody;
  },
  deps: AbdmAdapterDeps,
): Promise<void> {
  try {
    await getOrAcquireLinkToken(
      {
        iqTenantId: input.iqTenantId,
        abhaAddress: input.body.abhaAddress,
        abhaNumber: input.body.abhaNumber,
        name: input.body.demographics.name,
        gender: input.body.demographics.gender,
        yearOfBirth: input.body.demographics.yearOfBirth,
        timeoutMs: input.body.timeoutMs,
      },
      deps,
    );
    await deps.sessions.patch({
      iqTenantId: input.iqTenantId,
      sessionId: input.sessionId,
      state: "TOKEN_AVAILABLE",
      contextMerge: { tokenReady: true },
    });
  } catch (e) {
    const message =
      e instanceof LinkTokenNotAvailable
        ? e.message
        : e instanceof Error
          ? e.message
          : "link token acquisition failed";
    abdmWarn("abdm.m2.link_token.acquire_failed", {
      sessionId: input.sessionId,
      abhaAddress: input.body.abhaAddress,
      message,
    });
    await deps.sessions.patch({
      iqTenantId: input.iqTenantId,
      sessionId: input.sessionId,
      state: "FAILED",
      contextMerge: {
        error: { code: "LINK_TOKEN_UNAVAILABLE", message },
        tokenReady: false,
      },
    });
  }
}
