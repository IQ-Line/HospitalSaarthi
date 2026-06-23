import { randomUUID } from "node:crypto";
import type { GenerateTokenRequest } from "@hims/ts-sdk-abha/protocol/m2/index.js";
import type { AbdmAdapterDeps } from "../ports.js";
import { linkTokenExpiresAt } from "./decode-link-token-exp.js";
import { toGatewayAbhaNumberPlain } from "./m2-gateway-abha-number.js";
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

type LinkTokenLookupDeps = Pick<AbdmAdapterDeps, "linkTokens" | "payloadEncryptor">;

/**
 * Reads the current fresh (non-expired) cache row and returns its decrypted
 * plaintext token, or undefined if there is no fresh row or it fails to decrypt.
 * Preserves the cache's freshness semantics by delegating expiry to findFresh.
 */
async function readFreshLinkToken(
  iqTenantId: string,
  abhaAddress: string,
  deps: LinkTokenLookupDeps,
): Promise<string | undefined> {
  const row = await deps.linkTokens.findFresh(iqTenantId, abhaAddress);
  if (!row) return undefined;
  return deps.payloadEncryptor.decrypt(row.linkToken) || undefined;
}

async function requestTokenGeneration(
  input: LinkTokenAcquireInput,
  requestId: string,
  deps: Pick<AbdmAdapterDeps, "gateway" | "xHipId">,
): Promise<void> {
  const body: GenerateTokenRequest = {
    abhaAddress: input.abhaAddress,
    abhaNumber: toGatewayAbhaNumberPlain(input.abhaNumber),
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

/**
 * Polls the cache with exponential backoff until a fresh token appears or the
 * acquire deadline passes. Returns the decrypted token, or undefined on timeout.
 */
async function pollForFreshLinkToken(
  input: LinkTokenAcquireInput,
  deps: LinkTokenLookupDeps,
): Promise<string | undefined> {
  const deadline = Date.now() + linkTokenAcquireTimeoutMs(input.timeoutMs);
  let pollMs = linkTokenPollInitialMs();
  const pollMaxMs = linkTokenPollMaxMs();
  while (Date.now() < deadline) {
    await sleep(pollMs);
    pollMs = Math.min(pollMs * 2, pollMaxMs);
    const plain = await readFreshLinkToken(input.iqTenantId, input.abhaAddress, deps);
    if (plain) return plain;
  }
  return undefined;
}

export async function getOrAcquireLinkToken(
  input: LinkTokenAcquireInput,
  deps: Pick<AbdmAdapterDeps, "linkTokens" | "gateway" | "payloadEncryptor" | "xHipId">,
): Promise<string> {
  const cached = await readFreshLinkToken(input.iqTenantId, input.abhaAddress, deps);
  if (cached) return cached;

  const requestId = randomUUID();
  const claim = await deps.linkTokens.claimAcquisition(
    input.iqTenantId,
    input.abhaAddress,
    requestId,
  );

  if (claim === "fresh-exists") {
    const fresh = await readFreshLinkToken(input.iqTenantId, input.abhaAddress, deps);
    if (fresh) return fresh;
  } else if (claim === "claimed") {
    await requestTokenGeneration(input, requestId, deps);
  }

  const polled = await pollForFreshLinkToken(input, deps);
  if (polled) return polled;

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
