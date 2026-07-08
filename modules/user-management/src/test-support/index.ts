/**
 * Test-support surface for consumers composing this module (service wiring tests).
 * Exposed as `@hims/user-management/test-support` — never import from production code.
 */
export * from "./create-user-test-deps.js";
export * from "./department-catalog-port-stub.js";
export * from "./master-data-catalog-port-stub.js";
export * from "./noop-user-provisioning-repository.js";
