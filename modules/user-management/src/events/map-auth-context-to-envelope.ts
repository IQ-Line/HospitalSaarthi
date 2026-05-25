import { createHash } from "node:crypto";

/**
 * Matches {@link @hims/ts-sdk-events} envelope validation for UUID-shaped strings.
 */
const ENVELOPE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Fixed namespaces (RFC 4122 UUID) so the same non-UUID identity string always maps to the same envelope id.
 * Distinct namespaces prevent tenant vs actor slug collisions.
 */
import {
  DEVELOPMENT_ENVELOPE_ACTOR_NAMESPACE,
  DEVELOPMENT_ENVELOPE_TENANT_NAMESPACE,
} from "@hims/dev-bootstrap";

const ENVELOPE_TENANT_NAMESPACE = DEVELOPMENT_ENVELOPE_TENANT_NAMESPACE;
const ENVELOPE_ACTOR_NAMESPACE = DEVELOPMENT_ENVELOPE_ACTOR_NAMESPACE;

function parseUuidToBytes(uuid: string): Buffer {
  return Buffer.from(uuid.replace(/-/g, ""), "hex");
}

function formatUuidFromBytes(buf: Buffer): string {
  const h = buf.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

/** RFC 4122 UUID version 5 (SHA-1 over namespace + name). */
function uuidV5(name: string, namespaceUuid: string): string {
  const hash = createHash("sha1")
    .update(Buffer.concat([parseUuidToBytes(namespaceUuid), Buffer.from(name, "utf8")]))
    .digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  return formatUuidFromBytes(bytes);
}

/** `iq_tenant_id` / `actor_id` as required by {@link specs/events/_envelope.schema.json}. */
export type EnvelopeUuid = string & { readonly __brand: "EnvelopeUuid" };

function toEnvelopeUuid(value: string, namespace: string): EnvelopeUuid {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error("Envelope identity: tenant and actor ids must be non-empty");
  }
  if (ENVELOPE_UUID_RE.test(trimmed)) {
    return trimmed.toLowerCase() as EnvelopeUuid;
  }
  return uuidV5(trimmed, namespace) as EnvelopeUuid;
}

export type AuthContextForEnvelope = {
  tenantId: string;
  actorId: string;
};

/**
 * Maps handler / JWT-derived tenant and actor strings to envelope fields.
 * Valid UUIDs are normalized to lowercase; other strings get a deterministic UUID v5 (same input → same id).
 * Database and domain continue to use {@link AuthContextForEnvelope.tenantId} / repository APIs unchanged.
 */
export function mapAuthContextToEventEnvelope(
  ctx: AuthContextForEnvelope,
): { iq_tenant_id: EnvelopeUuid; actor_id: EnvelopeUuid } {
  return {
    iq_tenant_id: toEnvelopeUuid(ctx.tenantId, ENVELOPE_TENANT_NAMESPACE),
    actor_id: toEnvelopeUuid(ctx.actorId, ENVELOPE_ACTOR_NAMESPACE),
  };
}
