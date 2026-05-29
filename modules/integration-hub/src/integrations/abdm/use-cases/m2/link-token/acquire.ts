import type { AbdmTenantInput, AbdmAdapterDeps } from "../../../ports.js";
import { runLinkTokenAcquireBackground } from "./acquire-background.js";

export interface LinkTokenAcquireBody {
  abhaAddress: string;
  abhaNumber?: string;
  demographics: {
    name: string;
    gender: "M" | "F" | "O" | "D";
    yearOfBirth: number;
  };
  timeoutMs?: number;
  /**
   * When true, blocks until cache is populated (integration tests only).
   * Production/HIS should omit and poll GET /m2/link-token/status.
   */
  wait?: boolean;
}

export interface LinkTokenAcquireResult {
  sessionId: string;
  state: "TOKEN_REQUESTED" | "TOKEN_AVAILABLE" | "FAILED";
  abhaAddress: string;
  tokenReady?: boolean;
  message?: string;
}

/**
 * Pre-mint link token without starting HIP link/carecontext.
 * Returns 202 + TOKEN_REQUESTED immediately; NHA callback fills cache; poll status endpoint.
 */
export async function linkTokenAcquire(
  input: AbdmTenantInput<LinkTokenAcquireBody>,
  deps: AbdmAdapterDeps,
): Promise<LinkTokenAcquireResult> {
  const session = await deps.sessions.create({
    iqTenantId: input.iqTenantId,
    flowKind: "abdm.m2.hip-initiated-link.v1",
    initialContext: {
      abhaAddress: input.abhaAddress,
      abhaNumber: input.abhaNumber,
      patientName: input.demographics.name,
      careContexts: [],
    },
  });

  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: session.sessionId,
    state: "TOKEN_REQUESTED",
    contextMerge: { abhaAddress: input.abhaAddress, tokenReady: false },
  });

  const backgroundInput = {
    iqTenantId: input.iqTenantId,
    sessionId: session.sessionId,
    body: {
      abhaAddress: input.abhaAddress,
      abhaNumber: input.abhaNumber,
      demographics: input.demographics,
      timeoutMs: input.timeoutMs,
    },
  };

  if (input.wait) {
    await runLinkTokenAcquireBackground(backgroundInput, deps);
    const row = await deps.sessions.findById({
      iqTenantId: input.iqTenantId,
      sessionId: session.sessionId,
    });
    const state = (row?.state ?? "TOKEN_REQUESTED") as LinkTokenAcquireResult["state"];
    const ctx = (row?.context ?? {}) as Record<string, unknown>;
    const err = ctx.error as { message?: string } | undefined;
    return {
      sessionId: session.sessionId,
      state,
      abhaAddress: input.abhaAddress,
      tokenReady: state === "TOKEN_AVAILABLE",
      message: err?.message,
    };
  }

  void runLinkTokenAcquireBackground(backgroundInput, deps);

  return {
    sessionId: session.sessionId,
    state: "TOKEN_REQUESTED",
    abhaAddress: input.abhaAddress,
    tokenReady: false,
  };
}
