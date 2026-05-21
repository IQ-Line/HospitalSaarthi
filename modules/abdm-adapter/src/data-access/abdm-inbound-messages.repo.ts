import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq } from "@hims/ts-sdk-db";
import { abdmInboundMessages } from "../schema/tables.js";
import type { InboundMessagesPort } from "../ports.js";

export class DrizzleInboundMessagesRepo implements InboundMessagesPort {
  constructor(private readonly db: DbInstance) {}

  async insertIfNew(input: {
    iqTenantId: string;
    requestId: string;
    flowKind: string;
  }): Promise<boolean> {
    const rows = await this.db
      .insert(abdmInboundMessages)
      .values({
        iq_tenant_id: input.iqTenantId,
        request_id: input.requestId,
        flow_kind: input.flowKind,
      })
      .onConflictDoNothing()
      .returning({ request_id: abdmInboundMessages.request_id });
    return rows.length > 0;
  }

  async release(input: { iqTenantId: string; requestId: string }): Promise<void> {
    await this.db
      .delete(abdmInboundMessages)
      .where(
        and(
          eq(abdmInboundMessages.iq_tenant_id, input.iqTenantId),
          eq(abdmInboundMessages.request_id, input.requestId),
        ),
      );
  }
}
