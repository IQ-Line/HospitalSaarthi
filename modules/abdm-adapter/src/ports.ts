/**
 * Repository interfaces for the abdm-adapter module.
 *
 * Three ports collectively form `AbdmAdapterDeps` — the contract that every
 * use-case function takes as its second argument. Concrete implementations
 * live in `./data-access/`. The Fastify entry (`services/abdm-adapter-svc`)
 * constructs the concretions once at boot and threads them through the router.
 *
 * Phase-0 implementations (Drizzle repo, axios/undici gateway client, Fidelius
 * helper) become FSM side-effect handlers when the Integration Platform engine
 * lands (per ADR-0027). The port signatures themselves do not change.
 */

import type { AbdmSession } from "./domain/session.js";

/** Tenant scope on every use-case input (matches empi / FSM side-effect handler shape). */
export type AbdmTenantInput<T> = T & { iqTenantId: string };

export interface AbdmSessionsPort {
  /** Insert a fresh session row with state `INIT`. */
  create(input: {
    iqTenantId: string;
    flowKind: AbdmSession["flowKind"];
    initialContext?: Record<string, unknown>;
  }): Promise<AbdmSession>;

  /** Single-row read. Returns null when not found (caller decides 404 / 410). */
  findById(input: {
    iqTenantId: string;
    sessionId: string;
  }): Promise<AbdmSession | null>;

  /** Patch named scalar fields + merge into `context` JSONB. Returns updated row. */
  patch(input: {
    iqTenantId: string;
    sessionId: string;
    state?: AbdmSession["state"];
    txnId?: string;
    requestId?: string;
    xToken?: string;
    tToken?: string;
    contextMerge?: Record<string, unknown>;
  }): Promise<AbdmSession>;
}

/** Which upstream base URL to use (see env `ABDM_GATEWAY_BASE_URL` vs `ABDM_ABHA_API_BASE_URL`). */
export type AbdmGatewayRouteTarget = "gateway" | "abha";

/** How to decode a GET response body from NHA. */
export type GatewayGetResponseParser = "json" | "abha-card";

export interface GatewayClient {
  /**
   * POST to NHA. `abha` (default): ABHA API paths like `/v3/enrollment/...` with gateway bearer.
   * `gateway`: HIE-CM gateway paths like `/api/hiecm/gateway/v3/sessions` — no bearer (session uses body creds).
   */
  post<TReq, TRes>(input: {
    path: string;
    body: TReq;
    headers?: Record<string, string>;
    target?: AbdmGatewayRouteTarget;
    /** When false, omit Authorization (only used for gateway session POST). */
    withBearer?: boolean;
  }): Promise<TRes>;

  /** GET with gateway bearer unless `withBearer: false`. */
  get<TRes>(input: {
    path: string;
    headers?: Record<string, string>;
    target?: AbdmGatewayRouteTarget;
    withBearer?: boolean;
    /** Default `json`. Use `abha-card` for PDF/base64 card downloads (NHA often returns non-JSON). */
    responseParser?: GatewayGetResponseParser;
  }): Promise<TRes>;

  /**
   * GET `/v3/profile/public/certificate` — gateway bearer; result cached (TTL configurable on client).
   */
  getPublicCertificate(): Promise<{
    publicKey: string;
    encryptionAlgorithm: string;
  }>;

  /** Non-secret diagnostics for ops routes (token/cert cache bounds). */
  getDiagnosticsSnapshot(): {
    tokenValidUntilMs: number | null;
    certValidUntilMs: number | null;
    certCached: boolean;
  };
}

export interface FideliusEncryptor {
  /** Encrypt a payload for an external HIU under their public key. M3 HIP transfer. */
  encryptForPeer(input: {
    payloadJson: string;
    peerPublicKey: string;
    peerNonce: string;
  }): Promise<{ encryptedPayload: string; ourPublicKey: string; ourNonce: string }>;

  /** Decrypt an inbound payload from an external HIP using our key material. M3 HIU receive. */
  decryptFromPeer(input: {
    encryptedPayload: string;
    peerPublicKey: string;
    peerNonce: string;
    ourPrivateKey: string;
    ourNonce: string;
  }): Promise<string>;
}

export interface SecretsClient {
  /** Resolve an `env:ABDM_*` reference to its literal value. */
  resolve(reference: string): Promise<string>;
}

/** Aggregate dependency object every use-case receives. */
export interface AbdmAdapterDeps {
  sessions: AbdmSessionsPort;
  gateway: GatewayClient;
  fidelius: FideliusEncryptor;
  secrets: SecretsClient;
}
