import { and, desc, eq, ilike, or, sql, type DbInstance } from "@hims/ts-sdk-db";
import { inpatientOrders } from "../schema/tables.js";
import type {
  InpatientOrder,
  InpatientOrderListQuery,
  InpatientOrderRepo,
} from "../domain/inpatient-order.js";

const orderSeq = new Map<string, number>();

function fromDb(row: typeof inpatientOrders.$inferSelect): InpatientOrder {
  return {
    id: row.id,
    iq_tenant_id: row.iq_tenant_id,
    episode_id: row.episode_id,
    order_number: row.order_number,
    order_category: row.order_category as InpatientOrder["order_category"],
    item_code: row.item_code,
    item_name: row.item_name,
    quantity: row.quantity,
    dosage_instruction: row.dosage_instruction,
    frequency: row.frequency,
    duration_days: row.duration_days,
    priority: row.priority as InpatientOrder["priority"],
    status: row.status as InpatientOrder["status"],
    completed_at: row.completed_at?.toISOString() ?? null,
    cancelled_reason: row.cancelled_reason,
    billing_status: row.billing_status as InpatientOrder["billing_status"],
    notes: row.notes,
    idempotency_key: row.idempotency_key,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

function orderNumberSuffix(n: number): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `ORD-${ymd}-${String(n).padStart(4, "0")}`;
}

function matchesQuery(row: InpatientOrder, query: InpatientOrderListQuery): boolean {
  if (query.order_category && row.order_category !== query.order_category) return false;
  if (query.priority && row.priority !== query.priority) return false;
  if (query.status && row.status !== query.status) return false;
  if (query.q?.trim()) {
    const t = query.q.trim().toLowerCase();
    const hay = `${row.order_number} ${row.item_name} ${row.notes ?? ""}`.toLowerCase();
    if (!hay.includes(t)) return false;
  }
  return true;
}

function paginate<T>(rows: T[], page: number, limit: number) {
  const total = rows.length;
  return {
    data: rows.slice((page - 1) * limit, page * limit),
    total,
    page,
    limit,
    total_pages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

/** In-memory store — default for Swagger (`IPD_USE_MOCK_DATA=true`). */
export class InMemoryInpatientOrderRepo implements InpatientOrderRepo {
  private store = new Map<string, InpatientOrder>();

  private k(tenantId: string, id: string) {
    return `${tenantId}:${id}`;
  }

  async list(tenantId: string, episodeId: string, query: InpatientOrderListQuery) {
    const rows = [...this.store.values()]
      .filter(
        (r) =>
          r.iq_tenant_id === tenantId &&
          r.episode_id === episodeId &&
          matchesQuery(r, query),
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return paginate(rows, query.page, query.limit);
  }

  async getById(tenantId: string, episodeId: string, orderId: string) {
    const row = this.store.get(this.k(tenantId, orderId));
    if (!row || row.episode_id !== episodeId) return null;
    return row;
  }

  async getByIdempotencyKey(tenantId: string, key: string) {
    return [...this.store.values()].find((r) => r.iq_tenant_id === tenantId && r.idempotency_key === key) ?? null;
  }

  async insert(row: InpatientOrder) {
    this.store.set(this.k(row.iq_tenant_id, row.id), row);
    return row;
  }

  async nextOrderNumber(tenantId: string) {
    const n = (orderSeq.get(tenantId) ?? 0) + 1;
    orderSeq.set(tenantId, n);
    return orderNumberSuffix(n);
  }
}

/** Postgres via Drizzle. */
export class DrizzleInpatientOrderRepo implements InpatientOrderRepo {
  constructor(private db: DbInstance) {}

  async list(tenantId: string, episodeId: string, query: InpatientOrderListQuery) {
    const cond = [eq(inpatientOrders.iq_tenant_id, tenantId), eq(inpatientOrders.episode_id, episodeId)];
    if (query.order_category) cond.push(eq(inpatientOrders.order_category, query.order_category));
    if (query.priority) cond.push(eq(inpatientOrders.priority, query.priority));
    if (query.status) cond.push(eq(inpatientOrders.status, query.status));
    if (query.q?.trim()) {
      const t = `%${query.q.trim()}%`;
      cond.push(
        or(
          ilike(inpatientOrders.order_number, t),
          ilike(inpatientOrders.item_name, t),
          ilike(inpatientOrders.notes, t),
        )!,
      );
    }
    const where = and(...cond);
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(inpatientOrders)
      .where(where);
    const rows = await this.db
      .select()
      .from(inpatientOrders)
      .where(where)
      .orderBy(desc(inpatientOrders.created_at))
      .limit(query.limit)
      .offset((query.page - 1) * query.limit);
    const total = count ?? 0;
    return {
      data: rows.map(fromDb),
      total,
      page: query.page,
      limit: query.limit,
      total_pages: total ? Math.ceil(total / query.limit) : 0,
    };
  }

  async getById(tenantId: string, episodeId: string, orderId: string) {
    const [row] = await this.db
      .select()
      .from(inpatientOrders)
      .where(
        and(
          eq(inpatientOrders.iq_tenant_id, tenantId),
          eq(inpatientOrders.episode_id, episodeId),
          eq(inpatientOrders.id, orderId),
        ),
      )
      .limit(1);
    return row ? fromDb(row) : null;
  }

  async getByIdempotencyKey(tenantId: string, key: string) {
    const [row] = await this.db
      .select()
      .from(inpatientOrders)
      .where(and(eq(inpatientOrders.iq_tenant_id, tenantId), eq(inpatientOrders.idempotency_key, key)))
      .limit(1);
    return row ? fromDb(row) : null;
  }

  async insert(row: InpatientOrder) {
    const [r] = await this.db
      .insert(inpatientOrders)
      .values({
        ...row,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
        completed_at: row.completed_at ? new Date(row.completed_at) : null,
      })
      .returning();
    if (!r) throw new Error("insert failed");
    return fromDb(r);
  }

  async nextOrderNumber(tenantId: string) {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(inpatientOrders)
      .where(eq(inpatientOrders.iq_tenant_id, tenantId));
    return orderNumberSuffix((count ?? 0) + 1);
  }
}

export function createInpatientOrderRepo(
  db: DbInstance | undefined,
  useMock: boolean,
): InpatientOrderRepo {
  return useMock || !db ? new InMemoryInpatientOrderRepo() : new DrizzleInpatientOrderRepo(db);
}
