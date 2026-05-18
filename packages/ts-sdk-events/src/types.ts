export interface DomainEvent<T extends Record<string, unknown> = Record<string, unknown>> {
  readonly event_id: string;
  readonly event_type: string;
  readonly source_module: string;
  readonly iq_tenant_id: string;
  readonly occurred_at: string;
  /** Optional transport publish timestamp for future broker integrations. */
  readonly published_at?: string;
  readonly correlation_id: string;
  readonly actor_id: string;
  readonly event_contract_version: string;
  readonly payload: T;
}

export type EventHandler<T extends Record<string, unknown> = Record<string, unknown>> = (
  event: DomainEvent<T>,
) => Promise<void>;

export interface Subscription {
  unsubscribe(): Promise<void>;
}

export interface EventBusConfig {
  type: 'in-process';
  validateEnvelope?: boolean;
}
