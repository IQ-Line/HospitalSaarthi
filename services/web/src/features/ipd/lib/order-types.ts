import type { OrderPriority } from '../lib/order-form-constants';

export type OrderCategory =
  | 'medication'
  | 'procedure'
  | 'laboratory'
  | 'radiology'
  | 'consumable';

export type OrderUiStatus =
  | 'pending'
  | 'acknowledged'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type InpatientOrderApi = {
  id: string;
  episode_id: string;
  order_number: string;
  order_category: OrderCategory;
  item_name: string;
  quantity: number;
  priority: OrderPriority;
  status: string;
  description: string;
  department: string;
  sla: string;
  pending_ack: boolean;
  is_overdue: boolean;
  ack_by: string | null;
  created_at: string;
};

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

export type OrdersListParams = {
  page: number;
  limit: number;
  orderCategory?: OrderCategory | 'all';
  priority?: OrderPriority | 'all';
  status?: OrderUiStatus | 'all';
  q?: string;
};

export type OrdersListResponse = {
  data: InpatientOrderApi[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
};

export function mapOrderToTableRow(order: InpatientOrderApi) {
  return {
    id: order.id,
    orderNumber: order.order_number,
    type: order.order_category,
    description: order.description,
    priority: order.priority,
    status: (order.status === 'placed' ? 'pending' : order.status) as OrderUiStatus,
    orderedAt: new Date(order.created_at).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }),
    sla: order.sla,
    ackBy: order.ack_by ?? '',
    department: order.department,
    isOverdue: order.is_overdue,
    pendingAck: order.pending_ack,
  };
}

export type EpisodeOrderRow = ReturnType<typeof mapOrderToTableRow>;
