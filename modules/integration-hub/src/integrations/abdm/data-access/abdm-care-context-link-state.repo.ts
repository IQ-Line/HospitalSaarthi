import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq } from "@hims/ts-sdk-db";
import { abdmLinkedCareContexts } from "../schema/tables.js";
import type { CareContextLinkStatePort } from "../ports.js";

export class DrizzleCareContextLinkStateRepo implements CareContextLinkStatePort {
  constructor(private readonly db: DbInstance) {}

  async listLinkedReferences(input: {
    iqTenantId: string;
    abhaAddress: string;
  }): Promise<ReadonlySet<string>> {
    const rows = await this.db
      .select({ ref: abdmLinkedCareContexts.care_context_ref })
      .from(abdmLinkedCareContexts)
      .where(
        and(
          eq(abdmLinkedCareContexts.iq_tenant_id, input.iqTenantId),
          eq(abdmLinkedCareContexts.abha_address, input.abhaAddress),
        ),
      );
    return new Set(rows.map((row) => row.ref));
  }

  async markLinked(input: {
    iqTenantId: string;
    abhaAddress: string;
    careContextReferences: string[];
  }): Promise<void> {
    const refs = [
      ...new Set(input.careContextReferences.map((ref) => ref.trim()).filter(Boolean)),
    ];
    if (refs.length === 0) return;

    const linkedAt = new Date();
    await this.db
      .insert(abdmLinkedCareContexts)
      .values(
        refs.map((care_context_ref) => ({
          iq_tenant_id: input.iqTenantId,
          abha_address: input.abhaAddress,
          care_context_ref,
          linked_at: linkedAt,
        })),
      )
      .onConflictDoNothing({
        target: [
          abdmLinkedCareContexts.iq_tenant_id,
          abdmLinkedCareContexts.abha_address,
          abdmLinkedCareContexts.care_context_ref,
        ],
      });
  }
}
