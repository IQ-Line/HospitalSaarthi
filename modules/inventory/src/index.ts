export { createRouter } from "./router.js";
export type { InventoryRouterOptions } from "./router.js";

export { INVENTORY_SCHEMA_NAME } from "./schema/tables.js";
export { applyInventorySchemaMigration } from "./schema/apply-migration.js";
export { DrizzleInventoryItemRepository } from "./data-access/items.repo.js";
export { DrizzleInventoryIndentRepository } from "./data-access/indent.repo.js";
export { listItems } from "./use-cases/list-items.js";
export { createItem } from "./use-cases/create-item.js";
export { adjustStock } from "./use-cases/adjust-stock.js";
export type { AdjustStockDeps, AdjustStockInput } from "./use-cases/adjust-stock.js";
export { issueDispenseStock } from "./use-cases/issue-dispense-stock.js";
export type {
  IssueDispenseStockInput,
  IssueDispenseStockLine,
  IssueDispenseStockResult,
} from "./use-cases/issue-dispense-stock.js";
export { restoreDispenseStock } from "./use-cases/restore-dispense-stock.js";
export type {
  RestoreDispenseStockInput,
  RestoreDispenseStockLine,
  RestoreDispenseStockResult,
} from "./use-cases/restore-dispense-stock.js";
export { getIndentByNumber } from "./use-cases/get-indent-by-number.js";
export {
  listExpiringLots,
  DEFAULT_EXPIRING_LOTS_WINDOW_DAYS,
} from "./use-cases/list-expiring-lots.js";
export type { ListExpiringLotsDeps } from "./use-cases/list-expiring-lots.js";

export { createInventoryAuthzTargetResolver } from "./authz/inventory-authz-target-resolver.js";
export { HttpMasterDataGateway } from "./lib/http-master-data-gateway.js";

export type { StoreRow, CreateStoreInput, UpdateStoreInput } from "./domain/store.types.js";
export type { InventoryDeps, MasterDataGatewayPort, StoreRepo } from "./ports.js";
