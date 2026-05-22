import { randomUUID } from "node:crypto";
import type { GenerateTokenRequest } from "@hims/ts-sdk-abha/protocol/m2/index.js";
import type { AbdmAdapterDeps } from "../ports.js";
import { linkTokenExpiresAt } from "./decode-link-token-exp.js";
import { M2_GATEWAY_PATHS } from "./m2-gateway-paths.js";
import { sleep } from "./sleep.js";

function linkTokenAcquireTimeoutMs(override?: number): number {
  if (override !== undefined) return override;
  const fromEnv = Number(process.env["ABDM_LINK_TOKEN_ACQUIRE_TIMEOUT_MS"]);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 8_000;
}

function linkTokenPollInitialMs(): number {
  const n = Number(process.env["ABDM_LINK_TOKEN_POLL_INTERVAL_MS"]);
  return Number.isFinite(n) && n > 0 ? n : 200;
}

function linkTokenPollMaxMs(): number {
  const n = Number(process.env["ABDM_LINK_TOKEN_POLL_MAX_INTERVAL_MS"]);
  return Number.isFinite(n) && n > 0 ? n : 1_600;
}

export class LinkTokenNotAvailable extends Error {
  constructor(message = "Link token not available within timeout") {
    super(message);
    this.name = "LinkTokenNotAvailable";
  }
}

export interface LinkTokenAcquireInput {
  iqTenantId: string;
  abhaAddress: string;
  abhaNumber?: string;
  name: string;
  gender: "M" | "F" | "O" | "D";
  yearOfBirth: number;
  timeoutMs?: number;
}

export async function getOrAcquireLinkToken(
  input: LinkTokenAcquireInput,
  deps: Pick<AbdmAdapterDeps, "linkTokens" | "gateway" | "payloadEncryptor" | "xHipId">,
): Promise<string> {
  const cached = await deps.linkTokens.findFresh(input.iqTenantId, input.abhaAddress);
  if (cached) {
    const plain = deps.payloadEncryptor.decrypt(cached.linkToken);
    if (plain) return plain;
  }

  const requestId = randomUUID();
  const claim = await deps.linkTokens.claimAcquisition(
    input.iqTenantId,
    input.abhaAddress,
    requestId,
  );

  if (claim === "fresh-exists") {
    const fresh = await deps.linkTokens.findFresh(input.iqTenantId, input.abhaAddress);
    if (fresh) {
      const plain = deps.payloadEncryptor.decrypt(fresh.linkToken);
      if (plain) return plain;
    }
  } else if (claim === "claimed") {
    const body: GenerateTokenRequest = {
      abhaAddress: input.abhaAddress,
      abhaNumber: input.abhaNumber,
      name: input.name,
      gender: input.gender,
      yearOfBirth: input.yearOfBirth,
    };
    await deps.gateway.post({
      path: M2_GATEWAY_PATHS.generateToken,
      body,
      target: "gateway",
      requestId,
      xHipId: deps.xHipId,
    });
  }

  const deadline = Date.now() + linkTokenAcquireTimeoutMs(input.timeoutMs);
  let pollMs = linkTokenPollInitialMs();
  const pollMaxMs = linkTokenPollMaxMs();
  while (Date.now() < deadline) {
    await sleep(pollMs);
    pollMs = Math.min(pollMs * 2, pollMaxMs);
    const row = await deps.linkTokens.findFresh(input.iqTenantId, input.abhaAddress);
    if (row) {
      const plain = deps.payloadEncryptor.decrypt(row.linkToken);
      if (plain) return plain;
    }
  }

  throw new LinkTokenNotAvailable();
}

export async function completeLinkTokenFromCallback(
  input: {
    iqTenantId: string;
    abhaAddress: string;
    linkToken: string;
  },
  deps: Pick<AbdmAdapterDeps, "linkTokens" | "payloadEncryptor">,
): Promise<void> {
  const expiresAt = linkTokenExpiresAt(input.linkToken);
  const encrypted = deps.payloadEncryptor.encrypt(input.linkToken);
  await deps.linkTokens.completeAcquisition(
    input.iqTenantId,
    input.abhaAddress,
    encrypted,
    expiresAt,
  );
}
