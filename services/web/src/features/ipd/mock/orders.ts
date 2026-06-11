import type {
  CreateInpatientOrderInput,
  InpatientOrderApi,
  OrdersListParams,
  OrdersListResponse,
} from '../lib/order-types';

const store: InpatientOrderApi[] = [];

const SLA: Record<string, string> = {
  routine: '4 hours',
  urgent: '1 hour',
  stat: '15 minutes',
};

const DEPARTMENT: Record<string, string> = {
  medication: 'pharmacy',
  procedure: 'procedure',
  laboratory: 'laboratory',
  radiology: 'radiology',
  consumable: 'supplies',
};

function buildDescription(input: CreateInpatientOrderInput): string {
  const parts = [input.item_name.trim()];
  if (input.dosage_instruction?.trim()) parts.push(input.dosage_instruction.trim());
  if (input.frequency?.trim()) parts.push(input.frequency.trim().toUpperCase());
  return parts.join(' · ');
}

function orderNumberSuffix(n: number): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `ORD-${ymd}-${String(n).padStart(4, '0')}`;
}

export function listMockOrders(
  admissionId: string,
  params: OrdersListParams,
): OrdersListResponse {
  let rows = store.filter((o) => o.episode_id === admissionId);

  if (params.orderCategory && params.orderCategory !== 'all') {
    rows = rows.filter((o) => o.order_category === params.orderCategory);
  }
  if (params.priority && params.priority !== 'all') {
    rows = rows.filter((o) => o.priority === params.priority);
  }
  if (params.status && params.status !== 'all') {
    rows = rows.filter((o) => {
      const uiStatus = o.status === 'placed' ? 'pending' : o.status;
      return uiStatus === params.status;
    });
  }
  if (params.q?.trim()) {
    const q = params.q.trim().toLowerCase();
    rows = rows.filter((o) =>
      `${o.order_number} ${o.description} ${o.department} ${o.order_category}`
        .toLowerCase()
        .includes(q),
    );
  }

  rows = [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const total = rows.length;
  const start = (params.page - 1) * params.limit;
  const data = rows.slice(start, start + params.limit);

  return {
    data,
    total,
    page: params.page,
    limit: params.limit,
    total_pages: total === 0 ? 0 : Math.ceil(total / params.limit),
  };
}

export function createMockOrder(
  admissionId: string,
  input: CreateInpatientOrderInput,
): InpatientOrderApi {
  const ts = new Date().toISOString();
  const n = store.filter((o) => o.episode_id === admissionId).length + 1;
  const priority = input.priority ?? 'routine';
  const order: InpatientOrderApi = {
    id: crypto.randomUUID(),
    episode_id: admissionId,
    order_number: orderNumberSuffix(n),
    order_category: input.order_category,
    item_name: input.item_name.trim(),
    quantity: input.quantity ?? 1,
    priority,
    status: 'placed',
    description: buildDescription(input),
    department: DEPARTMENT[input.order_category] ?? input.order_category,
    sla: SLA[priority] ?? SLA.routine!,
    pending_ack: true,
    is_overdue: false,
    ack_by: null,
    created_at: ts,
  };
  store.unshift(order);
  return order;
}
