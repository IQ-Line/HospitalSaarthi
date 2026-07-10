import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { EventBus } from "@hims/ts-sdk-events";
import { DrizzleAbdmSessionsRepo } from "../../../../../src/integrations/abdm/data-access/abdm-sessions.repo.js";

describe("DrizzleAbdmSessionsRepo state-changed events", () => {
  it("publishes abdm.session.state-changed when state changes", async () => {
    const sessionId = randomUUID();
    const tenantId = "00000000-0000-4000-8000-000000000099";
    let state = "INIT";
    const publish = vi.fn().mockResolvedValue(undefined);
    const eventBus = { publish } as unknown as EventBus;

    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [
              {
                iq_tenant_id: tenantId,
                session_id: sessionId,
                flow_kind: "abdm.m1.login.v1",
                state,
                txn_id: null,
                request_id: null,
                x_token: null,
                t_token: null,
                context: {},
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
          }),
        }),
      }),
      update: () => ({
        set: (patch: { state?: string }) => {
          if (patch.state) state = patch.state;
          return {
            where: () => ({
              returning: async () => [
                {
                  iq_tenant_id: tenantId,
                  session_id: sessionId,
                  flow_kind: "abdm.m1.login.v1",
                  state,
                  txn_id: "txn-1",
                  request_id: null,
                  x_token: null,
                  t_token: null,
                  context: {},
                  created_at: new Date(),
                  updated_at: new Date(),
                },
              ],
            }),
          };
        },
      }),
    };

    const repo = new DrizzleAbdmSessionsRepo(db as never, eventBus);
    await repo.patch({
      iqTenantId: tenantId,
      sessionId,
      state: "OTP_REQUESTED",
      txnId: "txn-1",
    });

    expect(publish).toHaveBeenCalledTimes(1);
    const envelope = publish.mock.calls[0]?.[0] as { event_type: string; payload: unknown };
    expect(envelope.event_type).toBe("abdm.session.state-changed");
    expect(envelope.payload).toMatchObject({
      sessionId,
      flowKind: "abdm.m1.login.v1",
      prevState: "INIT",
      newState: "OTP_REQUESTED",
    });
  });
});
