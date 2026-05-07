import type { DomainEvent } from './types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Three dot-separated segments: <module>.<entity>.<action> (module may contain hyphens, e.g. user-management). */
const EVENT_TYPE_RE = /^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/;
const SEMVER_RE = /^\d+\.\d+\.\d+$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function randomBytes(size: number): Uint8Array {
  const cryptoApi = (globalThis as unknown as {
    crypto?: { getRandomValues: (arr: Uint8Array) => Uint8Array };
  }).crypto;
  if (!cryptoApi) {
    throw new Error('Web Crypto API not available');
  }
  return cryptoApi.getRandomValues(new Uint8Array(size));
}

export interface CreateEnvelopeInput<T extends Record<string, unknown>> {
  event_type: string;
  source_module: string;
  iq_tenant_id: string;
  correlation_id: string;
  actor_id: string;
  schema_version: string;
  payload: T;
}

export interface ValidateEnvelopeOptions {
  strict?: boolean;
}

const ENVELOPE_REQUIRED_FIELDS = new Set([
  "event_id",
  "event_type",
  "source_module",
  "iq_tenant_id",
  "timestamp",
  "correlation_id",
  "actor_id",
  "schema_version",
  "payload",
]);

function formatUuidFromBytes(bytes: Uint8Array): string {
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * RFC 9562 UUIDv7 layout:
 * - unix_ts_ms: 48 bits (big-endian)
 * - ver: 4 bits (0b0111)
 * - rand_a: 12 bits
 * - var: 2 bits (RFC 4122/9562 variant: 0b10)
 * - rand_b: 62 bits
 */
function generateUuidV7(): string {
  const timestampMs = BigInt(Date.now());
  const bytes = new Uint8Array(16);

  bytes[0] = Number((timestampMs >> 40n) & 0xffn);
  bytes[1] = Number((timestampMs >> 32n) & 0xffn);
  bytes[2] = Number((timestampMs >> 24n) & 0xffn);
  bytes[3] = Number((timestampMs >> 16n) & 0xffn);
  bytes[4] = Number((timestampMs >> 8n) & 0xffn);
  bytes[5] = Number(timestampMs & 0xffn);

  const randA = randomBytes(2);
  // ver (bits 48-51) MUST be 0b0111; rand_a occupies only the low nibble.
  bytes[6] = 0x70 | (randA[0]! & 0x0f);
  bytes[7] = randA[1]!;

  const randB = randomBytes(8);
  bytes[8] = 0x80 | (randB[0]! & 0x3f);
  bytes[9] = randB[1]!;
  bytes[10] = randB[2]!;
  bytes[11] = randB[3]!;
  bytes[12] = randB[4]!;
  bytes[13] = randB[5]!;
  bytes[14] = randB[6]!;
  bytes[15] = randB[7]!;

  return formatUuidFromBytes(bytes);
}

export function createEnvelope<T extends Record<string, unknown>>(
  input: CreateEnvelopeInput<T>,
): DomainEvent<T> {
  return {
    event_id: generateUuidV7(),
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

export function validateEnvelope(event: DomainEvent, options?: ValidateEnvelopeOptions): void {
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
  if (options?.strict === true) {
    for (const key of Object.keys(event)) {
      if (!ENVELOPE_REQUIRED_FIELDS.has(key)) {
        violations.push(`unexpected envelope field: ${key}`);
      }
    }
  }

  if (violations.length > 0) {
    throw new EnvelopeValidationError(violations);
  }
}
