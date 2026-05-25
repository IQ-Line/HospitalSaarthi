/**
 * Stable UUIDs for local dev, integration tests, and cross-service tenant headers.
 * Import from `@hims/dev-bootstrap` — do not duplicate in feature modules.
 */

import { DEVELOPMENT_SEED_TENANT_ID } from "./development-seed-users.js";

/** Configurator / `make seed` hospital tenant (billing tariffs, UM bootstrap). */
export const DEVELOPMENT_BOOTSTRAP_TENANT_ID = DEVELOPMENT_SEED_TENANT_ID;

/** Dev org id (Configurator `organizations`, event envelope actor namespace). */
export const DEVELOPMENT_BOOTSTRAP_ORG_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d481";

/**
 * EMPI / Registration Phase 0 placeholder when the UI has no session tenant.
 * Billing remaps this to {@link DEVELOPMENT_BOOTSTRAP_TENANT_ID} in non-production.
 */
export const DEVELOPMENT_EMPI_PLACEHOLDER_TENANT_ID = "550e8400-e29b-41d4-a716-446655440001";

/**
 * Static “tenant catalog” login sentinel (visitpad integration tests, MD tenant_master).
 */
export const DEVELOPMENT_VISITPAD_CATALOG_TENANT_UUID = "00000000-0000-0000-0000-000000000007";

/** Event envelope `iq_tenant_id` namespace for dev-only UM events. */
export const DEVELOPMENT_ENVELOPE_TENANT_NAMESPACE = DEVELOPMENT_BOOTSTRAP_TENANT_ID;

/** Event envelope `actor_id` namespace for dev-only UM events. */
export const DEVELOPMENT_ENVELOPE_ACTOR_NAMESPACE = DEVELOPMENT_BOOTSTRAP_ORG_ID;
