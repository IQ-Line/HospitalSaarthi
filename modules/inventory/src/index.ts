export { createRouter } from "./router.js";
export type { InventoryRouterOptions } from "./router.js";

export { INVENTORY_SCHEMA_NAME } from "./schema/tables.js";
export { applyInventorySchemaMigration } from "./schema/apply-migration.js";
export { DrizzleInventoryItemRepository } from "./data-access/items.repo.js";
export { DrizzleInventoryIndentRepository } from "./data-access/indent.repo.js";
export { listItems } from "./use-cases/list-items.js";
export { createItem } from "./use-cases/create-item.js";
export { getIndentByNumber } from "./use-cases/get-indent-by-number.js";

export { createInventoryAuthzTargetResolver } from "./authz/inventory-authz-target-resolver.js";
export { enforcePrincipalTenant } from "./authz/principal-tenant-hook.js";
export { HttpMasterDataGateway } from "./lib/http-master-data-gateway.js";

export type { StoreRow, CreateStoreInput, UpdateStoreInput } from "./domain/store.types.js";
export type { InventoryDeps, MasterDataGatewayPort, StoreRepo } from "./ports.js";
