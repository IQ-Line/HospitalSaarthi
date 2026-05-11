import type { PlanExpressionOperand, Value } from "@cerbos/core";
import {
  PlanExpressionValue,
  PlanKind,
  planResourcesResponseIsConditional,
  planResourcesResponseIsUnconditional,
} from "@cerbos/core";
import type { PlanResult } from "@hims/ts-sdk-authz";
import type { User } from "../ports/index.js";

type EvalCtx = {
  tenantId: string;
  user: User;
  principalAttr: Record<string, unknown>;
};

function isAbsent(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

function unpackValue(v: Value | unknown): unknown {
  if (v === null || typeof v !== "object") {
    return v;
  }
  const o = v as Record<string, unknown>;
  if ("stringValue" in o && o.stringValue !== undefined) return o.stringValue;
  if ("doubleValue" in o && o.doubleValue !== undefined) return o.doubleValue;
  if ("boolValue" in o && o.boolValue !== undefined) return o.boolValue;
  if ("intValue" in o && o.intValue !== undefined) return o.intValue;
  if ("nullValue" in o) return null;
  return v;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

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
  const o = node as Record<string, unknown>;
  if (typeof o.name === "string") return o.name;
  if (typeof o.variable === "string") return o.variable;
  return null;
}

function getConstantValue(node: unknown): unknown {
  if (node === null || typeof node !== "object") return undefined;
  if (node instanceof PlanExpressionValue) {
    return unpackValue(node.value);
  }
  const o = node as Record<string, unknown>;
  if ("value" in o) {
    return unpackValue(o.value);
  }
  return undefined;
}

function resolveVariable(name: string, ctx: EvalCtx): unknown {
  const resourcePrefix = "request.resource.attr.";
  if (name.startsWith(resourcePrefix)) {
    const key = name.slice(resourcePrefix.length);
    switch (key) {
      case "iq_tenant_id":
        return ctx.tenantId;
      case "department":
        return ctx.user.department ?? null;
      case "required_clearance":
        return ctx.user.clearance_tier_required ?? 0;
      // Legacy plan ASTs (pre-rename); safe to keep until all PDPs emit `required_clearance`.
      case "um_clearance_tier_required":
        return ctx.user.clearance_tier_required ?? 0;
      case "org_id":
        return ctx.user.org_id ?? null;
      default:
        return undefined;
    }
  }
  const principalPrefix = "request.principal.attr.";
  if (name.startsWith(principalPrefix)) {
    const key = name.slice(principalPrefix.length);
    if (Object.prototype.hasOwnProperty.call(ctx.principalAttr, key)) {
      return ctx.principalAttr[key];
    }
    return undefined;
  }
  return undefined;
}

function evaluateAtomic(node: unknown, ctx: EvalCtx): unknown {
  const varName = getVariableName(node);
  if (varName !== null) {
    return resolveVariable(varName, ctx);
  }
  const constVal = getConstantValue(node);
  if (constVal !== undefined) {
    return constVal;
  }
  const expr = getExpressionShape(node);
  if (expr !== null) {
    return evaluateExpression(expr.operator, expr.operands, ctx);
  }
  return undefined;
}

function evaluateExpression(operator: string, operands: unknown[], ctx: EvalCtx): unknown {
  const evalBool = (n: unknown) => truthy(evaluateAtomic(n, ctx));

  switch (operator) {
    case "and":
      return operands.every((n) => evalBool(n));
    case "or":
      return operands.some((n) => evalBool(n));
    case "not":
      return !evalBool(operands[0]);
    case "eq":
      return deepEqual(evaluateAtomic(operands[0], ctx), evaluateAtomic(operands[1], ctx));
    case "ne":
      return !deepEqual(evaluateAtomic(operands[0], ctx), evaluateAtomic(operands[1], ctx));
    case "lt":
      return compareOperands(operands[0], operands[1], ctx, (a, b) => a < b);
    case "lte":
    case "le":
      return compareOperands(operands[0], operands[1], ctx, (a, b) => a <= b);
    case "gt":
      return compareOperands(operands[0], operands[1], ctx, (a, b) => a > b);
    case "gte":
    case "ge":
      return compareOperands(operands[0], operands[1], ctx, (a, b) => a >= b);
    case "has": {
      const v = evaluateAtomic(operands[0], ctx);
      return !isAbsent(v);
    }
    case "size": {
      const v = evaluateAtomic(operands[0], ctx);
      if (v && typeof v === "object" && !Array.isArray(v)) {
        return Object.keys(v as Record<string, unknown>).length;
      }
      if (Array.isArray(v)) return v.length;
      return 0;
    }
    case "contains":
    case "listContains": {
      const left = evaluateAtomic(operands[0], ctx);
      const right = evaluateAtomic(operands[1], ctx);
      if (Array.isArray(left) && !Array.isArray(right)) {
        return left.some((x) => deepEqual(x, right));
      }
      if (Array.isArray(right) && !Array.isArray(left)) {
        return right.some((x) => deepEqual(x, left));
      }
      if (typeof left === "string" && typeof right === "string") {
        return left.includes(right);
      }
      return false;
    }
    default:
      throw new Error(`Unsupported Cerbos plan operator: ${operator}`);
  }
}

function compareOperands(
  leftNode: unknown,
  rightNode: unknown,
  ctx: EvalCtx,
  cmp: (a: number, b: number) => boolean,
): boolean {
  const a = toNumber(evaluateAtomic(leftNode, ctx));
  const b = toNumber(evaluateAtomic(rightNode, ctx));
  if (a === null || b === null) return false;
  return cmp(a, b);
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a === "object" && a !== null && typeof b === "object" && b !== null) {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }
  return false;
}

function truthy(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") return v.length > 0;
  return Boolean(v);
}

function evaluatePlanCondition(condition: PlanExpressionOperand, ctx: EvalCtx): boolean {
  return truthy(evaluateAtomic(condition, ctx));
}

/**
 * Filters an in-memory user list using the Cerbos {@link PlanResources} result for `user.read`.
 * One PDP plan call should precede this; this function performs no `checkResource` calls.
 */
export function filterUsersMatchingUserReadPlan(
  users: User[],
  plan: PlanResult,
  tenantId: string,
  /** Same key/value shape as Cerbos `principal.attr` (e.g. from {@link principalAttrsForCerbos}). */
  principalAttr: Record<string, unknown>,
): User[] {
  if (planResourcesResponseIsUnconditional(plan)) {
    if (plan.kind === PlanKind.ALWAYS_DENIED) return [];
    return users;
  }
  if (planResourcesResponseIsConditional(plan)) {
    return users.filter((user) =>
      evaluatePlanCondition(plan.condition, { tenantId, user, principalAttr }),
    );
  }
  return users;
}
