export type OrderCategory =
  | "medication"
  | "procedure"
  | "laboratory"
  | "radiology"
  | "consumable";

export type OrderPriority = "routine" | "urgent" | "stat";

export type OrderStatus =
  | "placed"
  | "acknowledged"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "on_hold";

export type BillingStatus = "pending" | "billed" | "waived";

export interface InpatientOrder {
  id: string;
  iq_tenant_id: string;
  episode_id: string;
  order_number: string;
  order_category: OrderCategory;
  item_code: string;
  item_name: string;
  quantity: string;
  dosage_instruction: string | null;
  frequency: string | null;
  duration_days: number | null;
  priority: OrderPriority;
  status: OrderStatus;
  completed_at: string | null;
  cancelled_reason: string | null;
  billing_status: BillingStatus;
  notes: string | null;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface InpatientOrderListQuery {
  order_category?: OrderCategory;
  priority?: OrderPriority;
  status?: OrderStatus;
  q?: string;
  page: number;
  limit: number;
}

export interface InpatientOrderListPage {
  data: InpatientOrder[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface InpatientOrderRepo {
  list(tenantId: string, episodeId: string, query: InpatientOrderListQuery): Promise<InpatientOrderListPage>;
  getById(tenantId: string, episodeId: string, orderId: string): Promise<InpatientOrder | null>;
  getByIdempotencyKey(tenantId: string, key: string): Promise<InpatientOrder | null>;
  insert(row: InpatientOrder): Promise<InpatientOrder>;
  nextOrderNumber(tenantId: string): Promise<string>;
}

export const ORDER_PRIORITY_SLA: Record<OrderPriority, string> = {
  routine: "4 hours",
  urgent: "1 hour",
  stat: "15 minutes",
};

export const ORDER_DEPARTMENT: Record<OrderCategory, string> = {
  medication: "pharmacy",
  procedure: "procedure",
  laboratory: "laboratory",
  radiology: "radiology",
  consumable: "supplies",
};

export interface InpatientOrderApi extends Omit<InpatientOrder, "quantity"> {
  quantity: number;
  department: string;
  sla: string;
  description: string;
  pending_ack: boolean;
  is_overdue: boolean;
  ack_by: string | null;
}

export function buildOrderDescription(order: InpatientOrder): string {
  const parts = [order.item_name];
  if (order.dosage_instruction?.trim()) parts.push(order.dosage_instruction.trim());
  if (order.frequency?.trim()) parts.push(order.frequency.trim());
  return parts.join(" · ");
}

export function toInpatientOrderApi(order: InpatientOrder): InpatientOrderApi {
  const { quantity, ...rest } = order;
  return {
    ...rest,
    quantity: Number(quantity) || 1,
    department: ORDER_DEPARTMENT[order.order_category],
    sla: ORDER_PRIORITY_SLA[order.priority],
    description: buildOrderDescription(order),
    pending_ack: order.status === "placed",
    is_overdue: false,
    ack_by: null,
  };
}

export function mapUiStatusToDb(status: string): OrderStatus | undefined {
  if (status === "pending") return "placed";
  const allowed: OrderStatus[] = [
    "placed",
    "acknowledged",
    "in_progress",
    "completed",
    "cancelled",
    "on_hold",
  ];
  return allowed.includes(status as OrderStatus) ? (status as OrderStatus) : undefined;
}

export function mapDbStatusToUi(status: OrderStatus): string {
  return status === "placed" ? "pending" : status;
}
