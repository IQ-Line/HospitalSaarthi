import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { AbdmSession } from "../../../../../../../src/integrations/abdm/domain/session.js";
import type { AbdmSessionsPort } from "../../../../../../../src/integrations/abdm/ports.js";
import { buildMockAbdmDeps } from "../../../../../../../src/integrations/abdm/test-utils/mock-deps.js";
import { addContextsPublish } from "../../../../../../../src/integrations/abdm/use-cases/m2/add-contexts/publish.js";
import {
  fakeGatewayClient,
  fakeSessionsPort,
  makeSession,
} from "../../../../../../helpers/abdm-fakes.js";

function mockSessions(): AbdmSessionsPort {
  const rows: AbdmSession[] = [];
  return fakeSessionsPort({
    create: async (input) => {
      const s = makeSession({
        iqTenantId: input.iqTenantId,
        sessionId: randomUUID(),
        flowKind: input.flowKind,
        context: input.initialContext ?? {},
      });
      rows.push(s);
      return s;
    },
    findById: async (input) =>
      rows.find(
        (r) => r.sessionId === input.sessionId && r.iqTenantId === input.iqTenantId,
      ) ?? null,
    patch: async (input) => {
      const s = rows.find(
        (r) => r.sessionId === input.sessionId && r.iqTenantId === input.iqTenantId,
      );
      if (!s) throw new Error("not found");
      if (input.state !== undefined) s.state = input.state;
      if (input.requestId !== undefined) s.requestId = input.requestId;
      return s;
    },
  });
}

describe("addContextsPublish", () => {
  it("posts context notify with PascalCase hiType", async () => {
    const post = vi.fn().mockResolvedValue({});
    const sessions = mockSessions();
    const deps = buildMockAbdmDeps({ sessions, gateway: fakeGatewayClient({ post }) });

    const result = await addContextsPublish(
      {
        iqTenantId: "tenant-1",
        abhaAddress: "user@sbx",
        patientReference: "patient-1",
        careContextReference: "visit-1",
        hiType: "OPCONSULTATION",
      },
      deps,
    );

    expect(result.requestId).toBeTruthy();
    expect(post).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.stringContaining("link/context/notify"),
        xHipId: "test-hip",
      }),
    );
    const body = post.mock.calls[0]![0].body as {
      notification: { hiTypes: string[] };
    };
    expect(body.notification.hiTypes).toEqual(["OPConsultation"]);
  });
});
