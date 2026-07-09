/**
 * Fully-typed ABDM port fakes for unit tests.
 *
 * `makeSession()` builds an `AbdmSession` the same way the Drizzle repo does:
 * construct the widest single-flow `AbdmSessionShape<AbdmFlowKind>` then narrow
 * to the discriminated union (the DB is the source of truth for the
 * flow<->state<->context correlation the type system enforces). Tests that hold
 * a session they know the flow of can narrow it back with the domain's own
 * `assertFlowKind`.
 *
 * `fakeSessionsPort()`, `fakeGatewayClient()` and `fakeFidelius()` return complete,
 * honestly-typed port objects; pass overrides for the methods a test drives.
 *
 * `baseAdapterDeps()` layers those honest defaults onto the existing
 * `buildMockAbdmDeps` (which fills every remaining required port) so a test can:
 *
 *   const deps = baseAdapterDeps({ sessions, gateway });
 */

import type {
  AbdmFlowKind,
  AbdmSession,
  AbdmSessionShape,
} from "../../src/integrations/abdm/domain/session.js";
import type {
  AbdmAdapterDeps,
  AbdmSessionsPort,
  FideliusEncryptor,
  GatewayClient,
  SecretsClient,
} from "../../src/integrations/abdm/ports.js";
import { buildMockAbdmDeps } from "../../src/integrations/abdm/test-utils/mock-deps.js";

export function makeSession(
  overrides: Partial<AbdmSessionShape<AbdmFlowKind>> = {},
): AbdmSession {
  const shape: AbdmSessionShape<AbdmFlowKind> = {
    iqTenantId: "00000000-0000-4000-8000-000000000099",
    sessionId: "00000000-0000-4000-8000-000000000001",
    flowKind: "abdm.m1.aadhaar-otp.v1",
    state: "INIT",
    txnId: null,
    requestId: null,
    xToken: null,
    tToken: null,
    context: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
  return shape as AbdmSession;
}

export function fakeSessionsPort(
  overrides: Partial<AbdmSessionsPort> = {},
): AbdmSessionsPort {
  return {
    create: async (input) => makeSession({ flowKind: input.flowKind }),
    findById: async () => null,
    patch: async (input) => makeSession({ sessionId: input.sessionId }),
    findUserLinkByTransactionId: async () => null,
    findUserLinkByLinkRefNumber: async () => null,
    findHipLinkByRequestId: async () => null,
    findByFlowAndRequestId: async () => null,
    findLatestLinkedUserLinkByAbhaAddress: async () => null,
    ...overrides,
  };
}

export function fakeGatewayClient(
  overrides: Partial<GatewayClient> = {},
): GatewayClient {
  return {
    post: async () => {
      throw new Error("fakeGatewayClient.post not stubbed");
    },
    get: async () => {
      throw new Error("fakeGatewayClient.get not stubbed");
    },
    getPublicCertificate: async () => ({
      publicKey: "",
      encryptionAlgorithm: "",
    }),
    getDiagnosticsSnapshot: () => ({
      tokenValidUntilMs: null,
      certValidUntilMs: null,
      certCached: false,
    }),
    invalidateBearer: () => {},
    ...overrides,
  };
}

export function fakeFidelius(
  overrides: Partial<FideliusEncryptor> = {},
): FideliusEncryptor {
  return {
    generateOurKeyMaterial: async () => ({
      ourPublicKey: "",
      ourPrivateKey: "",
      ourNonce: "",
    }),
    encryptForPeer: async () => ({
      encryptedPayload: "",
      ourPublicKey: "",
      ourNonce: "",
    }),
    encryptBundles: async () => ({
      encryptedPayloads: [],
      ourPublicKey: "",
      ourNonce: "",
    }),
    decryptBundle: async () => "",
    ...overrides,
  };
}

const fakeSecrets: SecretsClient = { resolve: async () => "" };

/**
 * A complete `AbdmAdapterDeps` with honestly-typed sessions / gateway / fidelius /
 * secrets defaults and every other required port filled by `buildMockAbdmDeps`.
 * Spread overrides for the ports a test drives.
 */
export function baseAdapterDeps(
  overrides: Partial<AbdmAdapterDeps> = {},
): AbdmAdapterDeps {
  return buildMockAbdmDeps({
    sessions: fakeSessionsPort(),
    gateway: fakeGatewayClient(),
    fidelius: fakeFidelius(),
    secrets: fakeSecrets,
    ...overrides,
  });
}
