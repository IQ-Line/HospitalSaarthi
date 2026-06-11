import { randomUUID } from "node:crypto";
import type { EpisodeRepo } from "../domain/episode.js";
import type {
  InpatientOrder,
  InpatientOrderRepo,
  OrderCategory,
  OrderPriority,
} from "../domain/inpatient-order.js";

export type CreateInpatientOrderInput = {
  order_category: OrderCategory;
  item_name: string;
  item_code?: string | null;
  quantity?: number | null;
  priority?: OrderPriority;
  dosage_instruction?: string | null;
  frequency?: string | null;
  duration_days?: number | null;
  description?: string | null;
  special_instructions?: string | null;
};

type Deps = {
  episodeRepo: EpisodeRepo;
  inpatientOrderRepo: InpatientOrderRepo;
};

function buildNotes(input: CreateInpatientOrderInput): string | null {
  const parts = [input.description?.trim(), input.special_instructions?.trim()].filter(Boolean);
  return parts.length ? parts.join("\n\n") : null;
}

function manualItemCode(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `manual:${slug || randomUUID()}`;
}

export async function createInpatientOrder(
  deps: Deps,
  tenantId: string,
  episodeId: string,
  input: CreateInpatientOrderInput,
  idempotencyKey: string | null,
): Promise<InpatientOrder | null> {
  const episode = await deps.episodeRepo.getById(tenantId, episodeId);
  if (!episode) return null;

  if (idempotencyKey) {
    const existing = await deps.inpatientOrderRepo.getByIdempotencyKey(tenantId, idempotencyKey);
    if (existing) return existing;
  }

  const ts = new Date().toISOString();
  const row: InpatientOrder = {
    id: randomUUID(),
    iq_tenant_id: tenantId,
    episode_id: episodeId,
    order_number: await deps.inpatientOrderRepo.nextOrderNumber(tenantId),
    order_category: input.order_category,
    item_code: input.item_code?.trim() || manualItemCode(input.item_name),
    item_name: input.item_name.trim(),
    quantity: String(input.quantity ?? 1),
    dosage_instruction: input.dosage_instruction?.trim() || null,
    frequency: input.frequency?.trim().toUpperCase() || null,
    duration_days: input.duration_days ?? null,
    priority: input.priority ?? "routine",
    status: "placed",
    completed_at: null,
    cancelled_reason: null,
    billing_status: "pending",
    notes: buildNotes(input),
    idempotency_key: idempotencyKey,
    created_at: ts,
    updated_at: ts,
  };

  return deps.inpatientOrderRepo.insert(row);
}
