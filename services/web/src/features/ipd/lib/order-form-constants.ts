export const ORDER_PRIORITIES = ['routine', 'urgent', 'stat'] as const;

export type OrderPriority = (typeof ORDER_PRIORITIES)[number];

export const ORDER_PRIORITY_SLA: Record<OrderPriority, string> = {
  routine: '4 hours',
  urgent: '1 hour',
  stat: '15 minutes',
};
