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
    const deps = {
      dataPush: { push: vi.fn() },
      fidelius: { encryptBundles: vi.fn() },
      m3ConsentArtefactsHiu: {
        findById: vi.fn().mockResolvedValue({
          careContexts: [{ careContextReference: "VISIT-1" }],
        }),
      },
      consentArtefacts: { findById: vi.fn().mockResolvedValue(null) },
      recordFoundation: {
        listBundles: vi.fn().mockResolvedValue([]),
        listCareContexts: vi.fn(),
      },
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

    expect(deps.fidelius.encryptBundles).not.toHaveBeenCalled();
    expect(deps.dataPush.push).not.toHaveBeenCalled();
  });
});
