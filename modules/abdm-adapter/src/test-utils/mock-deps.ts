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
      ({ insertIfNew: async () => true } as AbdmAdapterDeps["inboundMessages"]),
    linkTokens: overrides.linkTokens ?? ({} as AbdmAdapterDeps["linkTokens"]),
    consentArtefacts:
      overrides.consentArtefacts ?? ({} as AbdmAdapterDeps["consentArtefacts"]),
    empi:
      overrides.empi ??
      ({
        findPatientByAbhaAddress: async () => null,
        findPatientByDemographics: async () => null,
        findAbhaAddressByPatientId: async () => null,
      } as AbdmAdapterDeps["empi"]),
    recordFoundation:
      overrides.recordFoundation ??
      ({
        listUnlinkedCareContexts: async () => [],
        markCareContextLinked: async () => undefined,
        fetchBundlesForConsent: async () => [],
      } as AbdmAdapterDeps["recordFoundation"]),
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
    xCmId: overrides.xCmId ?? "sbx",
    ...overrides,
  };
}
