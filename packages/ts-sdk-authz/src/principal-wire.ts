import type { Value } from "@cerbos/core";
import type { FastifyRequest } from "fastify";
import type { Principal } from "@hims/ts-sdk-identity";
import { principalAttrsForCerbos } from "./principal-attr.js";

const CERBOS_ROLELESS_FALLBACK_ROLE = "__hims_authenticated__";

type CerbosPrincipalSnapshot = {
  id: string;
  roles: string[];
  attributes: Record<string, unknown>;
};

function readCerbosPrincipalSnapshot(request: FastifyRequest): CerbosPrincipalSnapshot | undefined {
  const raw = (request as { cerbosPrincipal?: unknown }).cerbosPrincipal;
  if (raw == null || typeof raw !== "object") return undefined;
  const snap = raw as Partial<CerbosPrincipalSnapshot>;
  if (typeof snap.id !== "string" || snap.id.length === 0) return undefined;
  if (!Array.isArray(snap.roles)) return undefined;
  if (snap.attributes == null || typeof snap.attributes !== "object") return undefined;
  return {
    id: snap.id,
    roles: snap.roles.filter((r): r is string => typeof r === "string"),
    attributes: snap.attributes as Record<string, unknown>,
  };
}

function mergeRoleCodes(identityRoles: string[], snapshotRoles: string[]): string[] {
  const roleCodeSet = new Set<string>();
  for (const raw of [...identityRoles, ...snapshotRoles]) {
    const code = raw.trim().toLowerCase();
    if (code.length > 0) {
      roleCodeSet.add(code);
    }
  }
  return [...roleCodeSet].sort((a, b) => a.localeCompare(b));
}

function rolesForCerbosWire(identity: Principal, snapshot?: CerbosPrincipalSnapshot): string[] {
  const merged = mergeRoleCodes(identity.roles ?? [], snapshot?.roles ?? []);
  return merged.length > 0 ? merged : [CERBOS_ROLELESS_FALLBACK_ROLE];
}

function attrForCerbosWire(
  identity: Principal,
  snapshot: CerbosPrincipalSnapshot | undefined,
  mergedRoleCodes: string[],
): Record<string, Value> {
  if (snapshot?.attributes) {
    return {
      ...(snapshot.attributes as Record<string, Value>),
      role_codes: mergedRoleCodes,
    };
  }
  return {
    ...principalAttrsForCerbos(identity),
    role_codes: mergedRoleCodes,
  };
}

/** Cerbos principal wire object: prefer UM `request.cerbosPrincipal` snapshot when enriched. */
export function buildCerbosPrincipalWire(request: FastifyRequest): {
  id: string;
  roles: string[];
  attr: Record<string, Value>;
} {
  const identity = request.user;
  const snapshot = readCerbosPrincipalSnapshot(request);
  const mergedRoleCodes = mergeRoleCodes(identity.roles ?? [], snapshot?.roles ?? []);
  return {
    id: snapshot?.id ?? identity.userId,
    roles: rolesForCerbosWire(identity, snapshot),
    attr: attrForCerbosWire(identity, snapshot, mergedRoleCodes),
  };
}
