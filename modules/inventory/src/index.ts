export {
  INVENTORY_SCHEMA_NAME,
  inventorySchema,
  inventoryMasterCategories,
  inventoryMasterItemTypes,
  inventoryMasterUoms,
  inventoryMasterManufacturers,
  inventoryMasterHsnGst,
  inventoryMasterStorageConditions,
  inventoryMasterStoreTypes,
  inventoryStores,
  inventoryStoreCodeSequences,
  inventoryItemCodeSequences,
  inventoryItems,
  inventoryGrns,
  inventoryGrnLines,
  inventoryLots,
  inventoryStock,
  inventoryIndents,
  inventoryIndentLines,
} from "./schema/tables.js";

export { applyInventorySchemaMigration } from "./schema/apply-migration.js";
