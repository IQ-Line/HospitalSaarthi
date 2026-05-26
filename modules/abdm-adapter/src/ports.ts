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

import type { M3HipState, M3HiuState } from "@hims/ts-sdk-abha";
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
  /** Drop dedupe row so gateway retries can re-run the handler after a failed attempt. */
  release(input: { iqTenantId: string; requestId: string }): Promise<void>;
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
  /** When NHA omits `abhaAddress` on `on-generate-token`, match outbound REQUEST-ID. */
  findAbhaAddressByPendingRequestId(
    iqTenantId: string,
    requestId: string,
  ): Promise<string | null>;
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
  /** Record Foundation HI type (e.g. OPCONSULTATION) for discover/link mapping. */
  hiType?: string;
}

export interface SmsClient {
  sendOtp(input: { phoneNo: string; message: string }): Promise<void>;
}

export interface LinkOtpStorePort {
  put(input: {
    iqTenantId: string;
    linkRefNumber: string;
    otp: string;
    expiresAt: Date;
  }): Promise<void>;
  consume(input: {
    iqTenantId: string;
    linkRefNumber: string;
    token: string;
  }): Promise<boolean>;
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
    /** Required for M3 loopback push to this adapter's HIU receiver (`x-tenant-id`). */
    iqTenantId?: string;
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
  /**
   * Generate an ephemeral BC Weierstrass curve25519 keypair + 32-byte transfer nonce.
   * HIU uses this when initiating a data request — the keypair must outlive the
   * encrypt call by minutes-to-hours (we send `ourPublicKey` + `ourNonce` in the
   * data-flow request body, wait for the HIP to push the encrypted bundle, then
   * derive the shared secret with `ourPrivateKey` to decrypt). The caller is
   * responsible for persisting `ourPrivateKey` encrypted-at-rest (via
   * `PayloadEncryptor`) on the M3 transfer row.
   *
   * Not used by HIP-side flows — they have a peer key from the inbound request and
   * generate-and-encrypt in one call via `encryptBundlesForPeer`.
   */
  generateOurKeyMaterial(): Promise<{
    ourPublicKey: string;   // base64, 65-byte uncompressed EC point
    ourPrivateKey: string;  // base64, 32 bytes — caller MUST encrypt at rest before persisting
    ourNonce: string;       // base64, 32 bytes
  }>;

  /** Encrypt a payload for an external HIU under their public key. M3 HIP transfer. */
  encryptForPeer(input: {
    payloadJson: string;
    peerPublicKey: string;
    peerNonce: string;
  }): Promise<{ encryptedPayload: string; ourPublicKey: string; ourNonce: string }>;

  /** One HIP key pair per push transaction (all care-context entries). */
  encryptBundlesForPeer(input: {
    payloadJsons: string[];
    peerPublicKey: string;
    peerNonce: string;
  }): Promise<{
    encryptedPayloads: string[];
    ourPublicKey: string;
    ourNonce: string;
  }>;

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
export interface M3ConsentRequestRow {
  iqTenantId: string;
  consentRequestId: string;
  sessionId: string;
  patientAbhaAddress: string;
  hipId: string | null;
  purposeCode: string;
  hiTypes: string[];
  permissionDateFrom: Date;
  permissionDateTo: Date;
  dataEraseAt: Date;
  state: M3HiuState;
  consentArtefactIds: string[];
  context: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface M3ConsentRequestsPort {
  insert(input: Omit<M3ConsentRequestRow, "createdAt" | "updatedAt">): Promise<void>;
  findByConsentRequestId(input: {
    iqTenantId: string;
    consentRequestId: string;
  }): Promise<M3ConsentRequestRow | null>;
  findBySessionId(input: {
    iqTenantId: string;
    sessionId: string;
  }): Promise<M3ConsentRequestRow | null>;
  patch(input: {
    iqTenantId: string;
    consentRequestId: string;
    state?: M3HiuState;
    consentArtefactIds?: string[];
    contextMerge?: Record<string, unknown>;
  }): Promise<void>;
  listActive(iqTenantId: string): Promise<M3ConsentRequestRow[]>;
  /** Expire stale `AWAITING_PATIENT_APPROVAL` rows past consent TTL. */
  janitor(): Promise<number>;
}

export interface M3ConsentArtefactHiuRow {
  iqTenantId: string;
  consentId: string;
  consentRequestId: string;
  patientAbhaAddress: string;
  hipId: string;
  status: string;
  dataEraseAt: Date;
  grantedAt: Date;
  hiTypes: string[];
  careContexts: Array<{
    patientReference: string;
    careContextReference: string;
  }>;
  artefactJson: Record<string, unknown>;
  signature: string;
  signatureValid: boolean;
  receivedAt: Date;
}

export interface M3ConsentArtefactsHiuPort {
  upsert(input: M3ConsentArtefactHiuRow): Promise<void>;
  findById(iqTenantId: string, consentId: string): Promise<M3ConsentArtefactHiuRow | null>;
  listForRequest(
    iqTenantId: string,
    consentRequestId: string,
  ): Promise<M3ConsentArtefactHiuRow[]>;
}

export interface M3DataTransferRow {
  iqTenantId: string;
  transferId: string;
  sessionId: string | null;
  flowKind: string;
  state: M3HiuState;
  consentId: string;
  outboundRequestId: string | null;
  cmTransactionId: string | null;
  hiuPrivateKeyJwk: string;
  hiuPublicKeyB64: string;
  hiuNonceB64: string;
  hipPublicKeyB64: string | null;
  hipNonceB64: string | null;
  dataPushUrl: string;
  bundleJson: Record<string, unknown> | null;
  error: { code: string; message: string } | null;
  createdAt: Date;
  updatedAt: Date;
  awaitingPushUntil: Date | null;
}

export interface M3DataTransfersPort {
  insert(input: Omit<M3DataTransferRow, "createdAt" | "updatedAt">): Promise<void>;
  findById(iqTenantId: string, transferId: string): Promise<M3DataTransferRow | null>;
  /** Inbound HIP push: `transferId` is globally unique; tenant may be unknown until lookup. */
  findByTransferId(transferId: string): Promise<M3DataTransferRow | null>;
  findByOutboundRequestId(input: {
    iqTenantId: string;
    outboundRequestId: string;
  }): Promise<M3DataTransferRow | null>;
  /** HIP push: HIU transfer row created by `start-data-request` for the same consent artefact. */
  findLatestActiveByConsentId(
    iqTenantId: string,
    consentId: string,
  ): Promise<M3DataTransferRow | null>;
  patch(input: {
    iqTenantId: string;
    transferId: string;
    state?: M3HiuState;
    cmTransactionId?: string;
    hipPublicKeyB64?: string;
    hipNonceB64?: string;
    bundleJson?: Record<string, unknown> | null;
    error?: { code: string; message: string } | null;
    awaitingPushUntil?: Date | null;
  }): Promise<void>;
  /** Atomically patch transfer row and optional HIU session row. */
  patchWithSession(input: {
    iqTenantId: string;
    transferId: string;
    transfer: {
      state?: M3HiuState;
      cmTransactionId?: string | null;
      hipPublicKeyB64?: string;
      hipNonceB64?: string;
      bundleJson?: Record<string, unknown> | null;
      error?: { code: string; message: string } | null;
      awaitingPushUntil?: Date | null;
    };
    session?: {
      sessionId: string;
      state?: M3HiuState;
      contextMerge?: Record<string, unknown>;
    };
  }): Promise<void>;
  /** Expire stale `AWAITING_PUSH` rows past `awaiting_push_until`. */
  janitor(): Promise<number>;
}

export interface AbdmAdapterDeps {
  sessions: AbdmSessionsPort;
  gateway: GatewayClient;
  fidelius: FideliusEncryptor;
  secrets: SecretsClient;
  inboundMessages: InboundMessagesPort;
  linkTokens: LinkTokensPort;
  consentArtefacts: ConsentArtefactsPort;
  m3ConsentRequests: M3ConsentRequestsPort;
  m3ConsentArtefactsHiu: M3ConsentArtefactsHiuPort;
  m3DataTransfers: M3DataTransfersPort;
  empi: EmpiClient;
  recordFoundation: RecordFoundationClient;
  dataPush?: HipDataPushClient;
  payloadEncryptor: PayloadEncryptor;
  eventBus?: EventBus;
  linkOtpStore: LinkOtpStorePort;
  sms: SmsClient;
  /** Default SMS phone when hip-initiated-link completes (E.164). */
  defaultSmsPhoneNo?: string;
  hipDisplayName?: string;
  xHipId: string;
  xHiuId: string;
  xCmId: string;
}
