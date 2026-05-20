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

import type { EventBus } from "@hims/ts-sdk-events";
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

  findUserLinkByTransactionId(input: {
    iqTenantId: string;
    transactionId: string;
  }): Promise<AbdmSession | null>;

  findUserLinkByLinkRefNumber(input: {
    iqTenantId: string;
    linkRefNumber: string;
  }): Promise<AbdmSession | null>;

  findHipLinkByRequestId(input: {
    iqTenantId: string;
    requestId: string;
  }): Promise<AbdmSession | null>;

  findByFlowAndRequestId(input: {
    iqTenantId: string;
    flowKind: AbdmSession["flowKind"];
    requestId: string;
  }): Promise<AbdmSession | null>;
}

export interface InboundMessagesPort {
  insertIfNew(input: {
    iqTenantId: string;
    requestId: string;
    flowKind: string;
  }): Promise<boolean>;
}

export type LinkTokenClaimResult = "claimed" | "fresh-exists" | "another-in-flight";

export interface LinkTokensPort {
  findFresh(
    iqTenantId: string,
    abhaAddress: string,
  ): Promise<{ linkToken: string; expiresAt: Date } | null>;
  claimAcquisition(
    iqTenantId: string,
    abhaAddress: string,
    requestId: string,
  ): Promise<LinkTokenClaimResult>;
  completeAcquisition(
    iqTenantId: string,
    abhaAddress: string,
    encryptedToken: string,
    expiresAt: Date,
  ): Promise<void>;
  invalidate(iqTenantId: string, abhaAddress: string): Promise<void>;
  janitor(): Promise<number>;
}

export interface ConsentArtefactRow {
  iqTenantId: string;
  consentId: string;
  patientId: string;
  hipId: string;
  hiuId: string;
  status: string;
  dataEraseAt: Date;
  grantedAt: Date;
  artefactJson: Record<string, unknown>;
  signature: string;
  signatureValid: boolean;
}

export interface ConsentArtefactsPort {
  upsert(input: ConsentArtefactRow): Promise<boolean>;
  findById(iqTenantId: string, consentId: string): Promise<ConsentArtefactRow | null>;
}

export interface CareContextRef {
  id: string;
  referenceNumber: string;
  display: string;
}

export interface EmpiClient {
  findPatientByAbhaAddress(input: {
    iqTenantId: string;
    abhaAddress: string;
  }): Promise<{ patientId: string; demographics: Record<string, unknown> } | null>;
  findPatientByDemographics(input: {
    iqTenantId: string;
    identifiers: Array<{ type: string; value: string }>;
  }): Promise<{ patientId: string; score: number } | null>;
  /** Resolve ABHA address for add-contexts / SMS after internal patient id. */
  findAbhaAddressByPatientId(input: {
    iqTenantId: string;
    patientId: string;
  }): Promise<string | null>;
}

export interface HealthRecordBundleEntry {
  careContextReference: string;
  contentJson: string;
  media: string;
}

export interface RecordFoundationClient {
  listUnlinkedCareContexts(input: {
    iqTenantId: string;
    patientId: string;
  }): Promise<CareContextRef[]>;
  markCareContextLinked(input: {
    iqTenantId: string;
    careContextId: string;
  }): Promise<void>;
  /** Bundles to encrypt and push under consent (M3 §6.3.5). */
  fetchBundlesForConsent(input: {
    iqTenantId: string;
    patientId: string;
    consentId: string;
    dateRange?: { from: string; to: string };
  }): Promise<HealthRecordBundleEntry[]>;
}

/** POST encrypted health data to HIU-provided dataPushUrl (not NHA gateway base). */
export interface HipDataPushClient {
  push(input: {
    dataPushUrl: string;
    body: Record<string, unknown>;
    requestId: string;
  }): Promise<void>;
}

export interface PayloadEncryptor {
  encrypt(plain: string): string;
  decrypt(cipher: string | null): string | null;
}

/** Which upstream base URL to use (see env `ABDM_GATEWAY_BASE_URL` vs `ABDM_ABHA_API_BASE_URL`). */
export type AbdmGatewayRouteTarget = "gateway" | "abha";

/** How to decode a GET response body from NHA. */
export type GatewayGetResponseParser = "json" | "abha-card";

export interface GatewayClient {
  /**
   * POST to NHA with gateway bearer by default.
   * `abha` (default): ABHA API base. `gateway`: HIE-CM base (`/api/hiecm/...`).
   * Set `withBearer: false` only for rare cases; session token uses a dedicated code path.
   */
  post<TReq, TRes>(input: {
    path: string;
    body: TReq;
    headers?: Record<string, string>;
    target?: AbdmGatewayRouteTarget;
    /** When false, omit Authorization (only used for gateway session POST). */
    withBearer?: boolean;
    /** Correlation REQUEST-ID for HIE-CM outbound (defaults to fresh UUID). */
    requestId?: string;
    /** HIP-initiated link token header. */
    linkToken?: string;
    /** HIP id for HIE-CM calls. */
    xHipId?: string;
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
  inboundMessages: InboundMessagesPort;
  linkTokens: LinkTokensPort;
  consentArtefacts: ConsentArtefactsPort;
  empi: EmpiClient;
  recordFoundation: RecordFoundationClient;
  dataPush?: HipDataPushClient;
  payloadEncryptor: PayloadEncryptor;
  eventBus?: EventBus;
  /** Default SMS phone when hip-initiated-link completes (E.164). */
  defaultSmsPhoneNo?: string;
  hipDisplayName?: string;
  xHipId: string;
  xCmId: string;
}
