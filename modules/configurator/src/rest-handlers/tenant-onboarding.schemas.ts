import {
  organizationTypeSchema,
} from "./route-schemas.js";

const uuidString = {
  type: "string",
  minLength: 36,
  maxLength: 36,
  pattern:
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
} as const;

const tenantModuleEnablementItemSchema = {
  type: "object",
  required: ["module_id", "is_active"],
  additionalProperties: false,
  properties: {
    module_id: uuidString,
    is_active: { type: "boolean" },
  },
} as const;

export const tenantOnboardingBodySchema = {
  type: "object",
  required: ["organization", "tenant", "plan", "modules", "admin"],
  additionalProperties: false,
  properties: {
    organization: {
      type: "object",
      required: ["name", "slug", "type"],
      additionalProperties: false,
      properties: {
        id: uuidString,
        name: { type: "string", minLength: 1 },
        slug: { type: "string", minLength: 3 },
        type: organizationTypeSchema,
        contact_email: { anyOf: [{ type: "string", format: "email" }, { type: "null" }] },
        website: { anyOf: [{ type: "string" }, { type: "null" }] },
        metadata: { anyOf: [{ type: "object" }, { type: "null" }] },
      },
    },
    tenant: {
      type: "object",
      required: ["name", "slug"],
      additionalProperties: false,
      properties: {
        name: { type: "string", minLength: 1 },
        slug: { type: "string", minLength: 3 },
        metadata: { anyOf: [{ type: "object" }, { type: "null" }] },
      },
    },
    plan: {
      type: "object",
      required: ["slug"],
      additionalProperties: false,
      properties: {
        slug: { type: "string", minLength: 1 },
        trial_end_date: { anyOf: [{ type: "string" }, { type: "null" }] },
        max_users_override: { anyOf: [{ type: "number", minimum: 1 }, { type: "null" }] },
        max_branches_override: { anyOf: [{ type: "number", minimum: 1 }, { type: "null" }] },
      },
    },
    modules: {
      type: "array",
      minItems: 0,
      maxItems: 2000,
      items: tenantModuleEnablementItemSchema,
    },
    admin: {
      type: "object",
      required: ["first_name", "last_name", "email", "password"],
      additionalProperties: false,
      properties: {
        first_name: { type: "string", minLength: 1 },
        last_name: { type: "string", minLength: 1 },
        email: { type: "string", format: "email", minLength: 5 },
        password: { type: "string", minLength: 8 },
        phone: { anyOf: [{ type: "string" }, { type: "null" }] },
        username: { anyOf: [{ type: "string" }, { type: "null" }] },
      },
    },
  },
} as const;
