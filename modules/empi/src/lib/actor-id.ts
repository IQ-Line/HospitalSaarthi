import { randomUUID } from "node:crypto";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Envelope validation requires actor_id to be a UUID; callers may send optional audit ids that are missing or invalid. */
export function actorIdOrRandom(id: string | null | undefined): string {
  if (id !== undefined && id !== null && UUID_RE.test(id.trim())) {
    return id.trim();
  }
  return randomUUID();
}
