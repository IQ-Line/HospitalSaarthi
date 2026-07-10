import { describe, expect, it, vi } from "vitest";
import { buildMockAbdmDeps } from "../../../../../../../src/integrations/abdm/test-utils/mock-deps.js";
import { startConsentRequest } from "../../../../../../../src/integrations/abdm/use-cases/m3/hiu/start-consent-request.js";
import { M3Hiu } from "../../../../../../../src/integrations/abdm/lib/m3-fsm-states.js";

describe("startConsentRequest", () => {
  it("creates session and consent request row", async () => {
    vi.stubEnv("ABDM_M3_MOCK_GATEWAY", "true");
    const sessions = {
      create: vi.fn(async () => ({
        iqTenantId: "t1",
        sessionId: "s1",
        flowKind: "abdm.m3.hiu.v1",
        state: "INIT",
        txnId: null,
        requestId: null,
        xToken: null,
        tToken: null,
        context: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      patch: vi.fn(async (input) => ({
        iqTenantId: input.iqTenantId,
        sessionId: input.sessionId,
        flowKind: "abdm.m3.hiu.v1",
        state: input.state ?? M3Hiu.CONSENT_INIT_REQUESTED,
        txnId: null,
        requestId: input.requestId ?? null,
        xToken: null,
        tToken: null,
        context: input.contextMerge ?? {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    };
    const m3ConsentRequests = {
      insert: vi.fn(async () => undefined),
      findByConsentRequestId: vi.fn(async () => null),
      findBySessionId: vi.fn(async () => null),
      patch: vi.fn(async () => undefined),
      listActive: vi.fn(async () => []),
    };
    const deps = buildMockAbdmDeps({
      sessions: sessions as never,
      m3ConsentRequests: m3ConsentRequests as never,
      xHiuId: "HIU-1",
    });

    const result = await startConsentRequest(
      {
        iqTenantId: "00000000-0000-0000-0000-000000000001",
        patientAbhaAddress: "test.user@sbx",
        purpose: "CAREMGT",
        hiTypes: ["OPConsultation"],
        dateRange: {
          from: "2026-01-01T00:00:00.000Z",
          to: "2026-05-24T00:00:00.000Z",
        },
      },
      deps,
    );

    expect(result.state).toBe(M3Hiu.CONSENT_INIT_REQUESTED);
    expect(sessions.create).toHaveBeenCalled();
    expect(m3ConsentRequests.insert).toHaveBeenCalled();
  });

  it("defaults requester REGNO when omitted (ABDM rejects empty identifier)", async () => {
    vi.stubEnv("ABDM_M3_MOCK_GATEWAY", "false");
    const gatewayPost = vi.fn(async (_input: { path: string; body: unknown }) => ({}));
    const sessions = {
      create: vi.fn(async () => ({
        iqTenantId: "t1",
        sessionId: "s1",
        flowKind: "abdm.m3.hiu.v1",
        state: "INIT",
        txnId: null,
        requestId: null,
        xToken: null,
        tToken: null,
        context: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      patch: vi.fn(async (input) => ({
        iqTenantId: input.iqTenantId,
        sessionId: input.sessionId,
        flowKind: "abdm.m3.hiu.v1",
        state: input.state ?? M3Hiu.CONSENT_INIT_REQUESTED,
        txnId: null,
        requestId: input.requestId ?? null,
        xToken: null,
        tToken: null,
        context: input.contextMerge ?? {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    };
    const deps = buildMockAbdmDeps({
      gateway: { post: gatewayPost } as never,
      sessions: sessions as never,
      xHiuId: "HIU-1",
    });

    await startConsentRequest(
      {
        iqTenantId: "00000000-0000-0000-0000-000000000001",
        patientAbhaAddress: "test.user@sbx",
        purpose: "CAREMGT",
        hiTypes: ["OPConsultation"],
        dateRange: {
          from: "2026-01-01T00:00:00.000Z",
          to: "2026-05-24T00:00:00.000Z",
        },
        requesterName: "Dr Test",
      },
      deps,
    );

    const body = gatewayPost.mock.calls[0]?.[0]?.body as {
      consent?: { requester?: { identifier?: { value?: string } } };
    };
    expect(body.consent?.requester?.identifier?.value).toBe("MH1001");
  });
});
