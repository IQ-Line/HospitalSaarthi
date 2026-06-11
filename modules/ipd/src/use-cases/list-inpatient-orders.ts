import type { EpisodeRepo } from "../domain/episode.js";
import type {
  InpatientOrderListPage,
  InpatientOrderRepo,
  OrderCategory,
  OrderPriority,
  OrderStatus,
} from "../domain/inpatient-order.js";

type Deps = {
  episodeRepo: EpisodeRepo;
  inpatientOrderRepo: InpatientOrderRepo;
};

export type ListInpatientOrdersQuery = {
  order_category?: OrderCategory;
  priority?: OrderPriority;
  status?: OrderStatus;
  q?: string;
  page: number;
  limit: number;
};

export async function listInpatientOrders(
  deps: Deps,
  tenantId: string,
  episodeId: string,
  query: ListInpatientOrdersQuery,
): Promise<InpatientOrderListPage | null> {
  const episode = await deps.episodeRepo.getById(tenantId, episodeId);
  if (!episode) return null;
  return deps.inpatientOrderRepo.list(tenantId, episodeId, query);
}

export async function getInpatientOrder(
  deps: Deps,
  tenantId: string,
  episodeId: string,
  orderId: string,
) {
  const episode = await deps.episodeRepo.getById(tenantId, episodeId);
  if (!episode) return null;
  return deps.inpatientOrderRepo.getById(tenantId, episodeId, orderId);
}
