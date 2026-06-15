import type { AbdmAdapterDeps } from "../ports.js";
import { InMemoryLinkOtpStore } from "../lib/link-otp-store.js";

/** Minimal `AbdmAdapterDeps` for unit tests (M1 + M2). */
export function buildMockAbdmDeps(
  overrides: Partial<AbdmAdapterDeps> = {},
): AbdmAdapterDeps {
  return {
    sessions: overrides.sessions ?? ({} as AbdmAdapterDeps["sessions"]),
    gateway: overrides.gateway ?? ({} as AbdmAdapterDeps["gateway"]),
    fidelius: overrides.fidelius ?? ({} as AbdmAdapterDeps["fidelius"]),
    secrets: overrides.secrets ?? ({} as AbdmAdapterDeps["secrets"]),
    inboundMessages:
      overrides.inboundMessages ??
      ({
        insertIfNew: async () => true,
        release: async () => undefined,
      } as AbdmAdapterDeps["inboundMessages"]),
    linkTokens: overrides.linkTokens ?? ({} as AbdmAdapterDeps["linkTokens"]),
    consentArtefacts:
      overrides.consentArtefacts ??
      ({
        upsert: async () => undefined,
        findById: async () => null,
      } as AbdmAdapterDeps["consentArtefacts"]),
    m3ConsentRequests:
      overrides.m3ConsentRequests ??
      ({
        insert: async () => undefined,
        findByConsentRequestId: async () => null,
        findBySessionId: async () => null,
        patch: async () => undefined,
        listActive: async () => [],
        janitor: async () => 0,
      } as AbdmAdapterDeps["m3ConsentRequests"]),
    m3ConsentArtefactsHiu:
      overrides.m3ConsentArtefactsHiu ??
      ({
        upsert: async () => undefined,
        findById: async () => null,
        listForRequest: async () => [],
      } as AbdmAdapterDeps["m3ConsentArtefactsHiu"]),
    m3DataTransfers:
      overrides.m3DataTransfers ??
      ({
        insert: async () => undefined,
        findById: async () => null,
        findByTransferId: async () => null,
        findByOutboundRequestId: async () => null,
        findLatestActiveByConsentId: async () => null,
        patch: async () => undefined,
        patchWithSession: async () => undefined,
        janitor: async () => 0,
      } as AbdmAdapterDeps["m3DataTransfers"]),
    empi:
      overrides.empi ??
      ({
        findPatientByAbhaAddress: async () => null,
        findPatientByDemographics: async () => null,
        findAbhaAddressByPatientId: async () => null,
        findM2PatientProfile: async () => null,
      } as AbdmAdapterDeps["empi"]),
    registration:
      overrides.registration ??
      ({
        findM2PatientProfile: async () => null,
        findPatientIdByAbhaAddress: async () => null,
      } as AbdmAdapterDeps["registration"]),
    recordFoundation:
      overrides.recordFoundation ??
      ({
        listCareContexts: async () => [],
        listBundles: async () => [],
      } as AbdmAdapterDeps["recordFoundation"]),
    careContextLinkState:
      overrides.careContextLinkState ??
      ({
        listLinkedReferences: async () => new Set(),
        markLinked: async () => undefined,
      } as AbdmAdapterDeps["careContextLinkState"]),
    dataPush: overrides.dataPush,
    payloadEncryptor:
      overrides.payloadEncryptor ??
      ({
        encrypt: (s: string) => s,
        decrypt: (s: string | null) => s,
      } as AbdmAdapterDeps["payloadEncryptor"]),
    linkOtpStore: overrides.linkOtpStore ?? new InMemoryLinkOtpStore(),
    sms: overrides.sms ?? ({ sendOtp: async () => undefined } as AbdmAdapterDeps["sms"]),
    xHipId: overrides.xHipId ?? "test-hip",
    xHiuId: overrides.xHiuId ?? "test-hiu",
    xCmId: overrides.xCmId ?? "sbx",
    ...overrides,
  };
}
