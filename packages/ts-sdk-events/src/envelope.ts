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
  occurred_at: string;
  correlation_id: string;
  actor_id: string;
  event_contract_version: string;
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
  "occurred_at",
  "published_at",
  "correlation_id",
  "actor_id",
  "event_contract_version",
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

const isUuid = (value: unknown): boolean => typeof value === 'string' && UUID_RE.test(value);
const isIsoDate = (value: unknown): boolean =>
  typeof value === 'string' && ISO_DATE_RE.test(value);

/**
 * Per-field validation rules. Each rule's `valid` predicate is checked against the
 * envelope; a falsy result appends `message` to the violation list. This preserves the
 * exact field order, predicates, and messages of the original inline checks.
 */
const FIELD_RULES: ReadonlyArray<{
  valid: (event: DomainEvent) => boolean;
  message: string;
}> = [
  { valid: (e) => isUuid(e.event_id), message: 'event_id must be a valid UUID' },
  {
    valid: (e) => typeof e.event_type === 'string' && EVENT_TYPE_RE.test(e.event_type),
    message: 'event_type must match <module>.<entity>.<action> pattern',
  },
  {
    valid: (e) => typeof e.source_module === 'string' && e.source_module.length > 0,
    message: 'source_module is required',
  },
  { valid: (e) => isUuid(e.iq_tenant_id), message: 'iq_tenant_id must be a valid UUID' },
  { valid: (e) => isIsoDate(e.occurred_at), message: 'occurred_at must be ISO-8601' },
  {
    // published_at is optional; only validate the format when present.
    valid: (e) => e.published_at === undefined || isIsoDate(e.published_at),
    message: 'published_at must be ISO-8601 when provided',
  },
  { valid: (e) => isUuid(e.correlation_id), message: 'correlation_id must be a valid UUID' },
  { valid: (e) => isUuid(e.actor_id), message: 'actor_id must be a valid UUID' },
  {
    valid: (e) =>
      typeof e.event_contract_version === 'string' && SEMVER_RE.test(e.event_contract_version),
    message: 'event_contract_version must be semver (e.g. 1.0.0)',
  },
  {
    valid: (e) => e.payload !== null && typeof e.payload === 'object' && !Array.isArray(e.payload),
    message: 'payload must be a non-null object',
  },
];

function collectUnexpectedFieldViolations(event: DomainEvent): string[] {
  return Object.keys(event)
    .filter((key) => !ENVELOPE_REQUIRED_FIELDS.has(key))
    .map((key) => `unexpected envelope field: ${key}`);
}

export function validateEnvelope(event: DomainEvent, options?: ValidateEnvelopeOptions): void {
  const violations: string[] = [];

  for (const rule of FIELD_RULES) {
    if (!rule.valid(event)) {
      violations.push(rule.message);
    }
  }

  if (options?.strict === true) {
    violations.push(...collectUnexpectedFieldViolations(event));
  }

  if (violations.length > 0) {
    throw new EnvelopeValidationError(violations);
  }
}
