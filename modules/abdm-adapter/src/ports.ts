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

export interface GatewayClient {
  /** Authenticated POST to the ABDM gateway. Adds bearer token + REQUEST-ID + TIMESTAMP. */
  post<TReq, TRes>(input: {
    path: string;
    body: TReq;
    headers?: Record<string, string>;
  }): Promise<TRes>;

  /** Authenticated GET. */
  get<TRes>(input: {
    path: string;
    headers?: Record<string, string>;
  }): Promise<TRes>;
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
