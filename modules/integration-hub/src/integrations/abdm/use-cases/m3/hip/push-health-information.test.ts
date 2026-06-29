import { describe, expect, it, vi } from "vitest";
import type { AbdmAdapterDeps } from "../../../ports.js";
import type { AbdmSession } from "../../../domain/session.js";
import { pushHealthInformationForSession } from "./push-health-information.js";

function hipSession(): AbdmSession<"abdm.m3.hip.v1"> {
  return {
    sessionId: "sess-1",
    flowKind: "abdm.m3.hip.v1",
    state: "DATA_REQUESTED",
    context: {},
  } as AbdmSession<"abdm.m3.hip.v1">;
}

describe("pushHealthInformationForSession", () => {
  it("fails before encrypt when Record Foundation returns zero bundles", async () => {
    const encryptBundles = vi.fn();
    const dataPush = vi.fn();
    const listCareContexts = vi.fn().mockResolvedValue([]);
    const deps = {
      dataPush: { push: dataPush },
      fidelius: { encryptBundles },
      m3ConsentArtefactsHiu: {
        findById: vi.fn().mockResolvedValue({
          careContexts: [{ careContextReference: "VISIT-1" }],
        }),
      },
      consentArtefacts: { findById: vi.fn().mockResolvedValue(null) },
      recordFoundation: {
        listBundles: vi.fn().mockResolvedValue([]),
        listCareContexts,
      },
      empi: { findPatientByAbhaAddress: vi.fn().mockResolvedValue(null) },
      sessions: { patch: vi.fn().mockResolvedValue(undefined) },
      xHipId: "IN3610001625",
      xCmId: "sbx",
    } as unknown as AbdmAdapterDeps;

    await expect(
      pushHealthInformationForSession(
        {
          iqTenantId: "00000000-0000-4000-8000-0000000000aa",
          session: hipSession(),
          parsed: {
            consentId: "consent-1",
            transactionId: "txn-1",
            dataPushUrl: "https://apissbx.abdm.gov.in/push",
            peerPublicKey:
              "BCpsBW37KgfLyjxJK0zHHG26hDjxzK368DEO4PapzFhQM0cghZziKuvJh5/anTnHitVHKMn0Owr1HvcH1fm0DpA=",
            peerNonce: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
          },
          patientId: "patient-1",
        },
        deps,
      ),
    ).rejects.toThrow(/No bundles from Record Foundation/);

    expect(encryptBundles).not.toHaveBeenCalled();
    expect(dataPush).not.toHaveBeenCalled();
    expect(listCareContexts).not.toHaveBeenCalled();
  });

  it("does not fall back to all patient care contexts when consent refs miss bundles", async () => {
    vi.stubEnv("ABDM_M2_MOCK_PLATFORM", "false");
    const encryptBundles = vi.fn();
    const dataPush = vi.fn();
    const listBundles = vi.fn().mockResolvedValue([]);
    const listCareContexts = vi.fn().mockResolvedValue([
      {
        id: "ctx-1",
        referenceNumber: "0fe7bcc3-7a7b-4673-a819-450d02ee9498_OPConsultNote",
        display: "OP consultation",
        hiType: "opd_visit",
      },
    ]);
    const deps = {
      dataPush: { push: dataPush },
      fidelius: { encryptBundles },
      m3ConsentArtefactsHiu: {
        findById: vi.fn().mockResolvedValue({
          careContexts: [{ careContextReference: "stale-ref_OPConsultNote" }],
          patientAbhaAddress: "yashiverma200111@sbx",
        }),
      },
      consentArtefacts: { findById: vi.fn().mockResolvedValue(null) },
      recordFoundation: { listBundles, listCareContexts },
      empi: {
        findPatientByAbhaAddress: vi
          .fn()
          .mockResolvedValue({ patientId: "53b730d8-ae32-4d59-9fcb-6707b26676c6", demographics: {} }),
      },
      sessions: { patch: vi.fn().mockResolvedValue(undefined) },
      xHipId: "IN3610001625",
      xCmId: "sbx",
    } as unknown as AbdmAdapterDeps;

    await expect(
      pushHealthInformationForSession(
        {
          iqTenantId: "1e8b5a2b-c4a2-4405-baad-c39b515a3426",
          session: hipSession(),
          parsed: {
            consentId: "consent-stale",
            transactionId: "txn-1",
            dataPushUrl: "https://apissbx.abdm.gov.in/push",
            peerPublicKey:
              "BCpsBW37KgfLyjxJK0zHHG26hDjxzK368DEO4PapzFhQM0cghZziKuvJh5/anTnHitVHKMn0Owr1HvcH1fm0DpA=",
            peerNonce: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
          },
          patientId: "00000000-0000-4000-8000-000000000001",
        },
        deps,
      ),
    ).rejects.toThrow(/No bundles from Record Foundation/);

    expect(listBundles).not.toHaveBeenCalled();
    expect(encryptBundles).not.toHaveBeenCalled();
    expect(dataPush).not.toHaveBeenCalled();
  });
});
