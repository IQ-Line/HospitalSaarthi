export { createRouter } from "./router.js";
export type { InventoryRouterOptions } from "./router.js";

export { INVENTORY_SCHEMA_NAME } from "./schema/tables.js";
export { applyInventorySchemaMigration } from "./schema/apply-migration.js";

export { createInventoryAuthzTargetResolver } from "./authz/inventory-authz-target-resolver.js";
export { HttpMasterDataGateway } from "./lib/http-master-data-gateway.js";

export type { StoreRow, CreateStoreInput, UpdateStoreInput } from "./domain/store.types.js";
export type { InventoryDeps, MasterDataGatewayPort, StoreRepo } from "./ports.js";
