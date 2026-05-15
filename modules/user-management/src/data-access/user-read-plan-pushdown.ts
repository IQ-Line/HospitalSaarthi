import type { PlanExpressionOperand } from "@cerbos/core";
import { PlanExpressionValue, PlanExpressionVariable } from "@cerbos/core";

const ALLOWED_VARIABLE_PREFIXES = [
  "request.resource.attr.",
  "request.principal.attr.",
] as const;

const ALLOWED_RESOURCE_ATTR_SUFFIXES = new Set([
  "iq_tenant_id",
  "department",
  "required_clearance",
  "org_id",
  "um_clearance_tier_required",
]);

const ALLOWED_PRINCIPAL_ATTR_SUFFIXES = new Set([
  "iq_tenant_id",
  "capabilities",
  "delegated_capabilities",
  "department",
  "um_clearance_effective_tier",
  "clearances",
]);

const ALLOWED_OPERATORS = new Set([
  "and",
  "or",
  "not",
  "eq",
  "ne",
  "lt",
  "lte",
  "le",
  "gt",
  "gte",
  "ge",
  "has",
  "size",
  "contains",
  "listContains",
  "in",
]);

function getExpressionShape(
  node: unknown,
): { operator: string; operands: unknown[] } | null {
  if (node === null || typeof node !== "object") return null;
  const o = node as Record<string, unknown>;
  if ("expression" in o && o.expression !== undefined && o.expression !== null) {
    return getExpressionShape(o.expression);
  }
  if (typeof o.operator === "string" && Array.isArray(o.operands)) {
    return { operator: o.operator, operands: o.operands };
  }
  return null;
}

function getVariableName(node: unknown): string | null {
  if (node === null || typeof node !== "object") return null;
  if (node instanceof PlanExpressionVariable) {
    return node.name;
  }
  const o = node as Record<string, unknown>;
  if (typeof o.name === "string") return o.name;
  if (typeof o.variable === "string") return o.variable;
  return null;
}

function isAllowedVariable(name: string): boolean {
  const prefix = ALLOWED_VARIABLE_PREFIXES.find((p) => name.startsWith(p));
  if (prefix === undefined) return false;
  const suffix = name.slice(prefix.length);
  if (prefix === "request.resource.attr.") {
    return ALLOWED_RESOURCE_ATTR_SUFFIXES.has(suffix);
  }
  return ALLOWED_PRINCIPAL_ATTR_SUFFIXES.has(suffix);
}

function collectVariables(node: unknown, out: Set<string>): void {
  const v = getVariableName(node);
  if (v !== null) out.add(v);
  const shape = getExpressionShape(node);
  if (shape !== null) {
    if (!ALLOWED_OPERATORS.has(shape.operator)) {
      out.add(`__unsupported_operator__:${shape.operator}`);
      return;
    }
    for (const child of shape.operands) {
      collectVariables(child, out);
    }
    return;
  }
  if (node instanceof PlanExpressionValue) return;
}

/**
 * Returns true when the Cerbos plan condition only references variables/operators we can mirror
 * with the bundled `user.read` SQL push-down (tenant still applied separately).
 */
export function planConditionAllowsUserReadResourceSqlPushdown(
  condition: PlanExpressionOperand,
): boolean {
  const vars = new Set<string>();
  collectVariables(condition, vars);
  for (const v of vars) {
    if (v.startsWith("__unsupported_operator__:")) return false;
    if (!isAllowedVariable(v)) return false;
  }
  return [...vars].some((v) => v === "request.resource.attr.required_clearance");
}
