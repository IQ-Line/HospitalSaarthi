import { randomUUID } from 'node:crypto';
import type { DomainEvent } from './types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EVENT_TYPE_RE = /^[a-z]+\.[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/;
const SEMVER_RE = /^\d+\.\d+\.\d+$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

export interface CreateEnvelopeInput<T extends Record<string, unknown>> {
  event_type: string;
  source_module: string;
  iq_tenant_id: string;
  correlation_id: string;
  actor_id: string;
  schema_version: string;
  payload: T;
}

export function createEnvelope<T extends Record<string, unknown>>(
  input: CreateEnvelopeInput<T>,
): DomainEvent<T> {
  return {
    event_id: randomUUID(),
    timestamp: new Date().toISOString(),
    ...input,
  };
}

export class EnvelopeValidationError extends Error {
  constructor(
    public readonly violations: string[],
  ) {
    super(`Invalid event envelope: ${violations.join('; ')}`);
    this.name = 'EnvelopeValidationError';
  }
}

export function validateEnvelope(event: DomainEvent): void {
  const violations: string[] = [];

  if (typeof event.event_id !== 'string' || !UUID_RE.test(event.event_id)) {
    violations.push('event_id must be a valid UUID');
  }
  if (typeof event.event_type !== 'string' || !EVENT_TYPE_RE.test(event.event_type)) {
    violations.push('event_type must match <module>.<entity>.<action> pattern');
  }
  if (typeof event.source_module !== 'string' || event.source_module.length === 0) {
    violations.push('source_module is required');
  }
  if (typeof event.iq_tenant_id !== 'string' || !UUID_RE.test(event.iq_tenant_id)) {
    violations.push('iq_tenant_id must be a valid UUID');
  }
  if (typeof event.timestamp !== 'string' || !ISO_DATE_RE.test(event.timestamp)) {
    violations.push('timestamp must be ISO-8601');
  }
  if (typeof event.correlation_id !== 'string' || !UUID_RE.test(event.correlation_id)) {
    violations.push('correlation_id must be a valid UUID');
  }
  if (typeof event.actor_id !== 'string' || !UUID_RE.test(event.actor_id)) {
    violations.push('actor_id must be a valid UUID');
  }
  if (typeof event.schema_version !== 'string' || !SEMVER_RE.test(event.schema_version)) {
    violations.push('schema_version must be semver (e.g. 1.0.0)');
  }
  if (event.payload === null || typeof event.payload !== 'object' || Array.isArray(event.payload)) {
    violations.push('payload must be a non-null object');
  }

  if (violations.length > 0) {
    throw new EnvelopeValidationError(violations);
  }
}
