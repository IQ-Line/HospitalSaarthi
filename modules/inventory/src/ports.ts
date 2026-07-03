import type {
  CreateStoreInput,
  ListStoresQuery,
  MasterDataStoreType,
  StoreRow,
  UpdateStoreInput,
} from "./domain/store.types.js";
import type { IndentLineRow, IndentRow } from "./domain/indent.types.js";
export type { MasterDataStoreType } from "./domain/store.types.js";

export type StoreRepo = {
  list(tenantId: string, query: ListStoresQuery): Promise<{ rows: StoreRow[]; total: number }>;
  findById(tenantId: string, storeId: string): Promise<StoreRow | undefined>;
  findCentralStore(tenantId: string): Promise<StoreRow | undefined>;
  create(
    tenantId: string,
    storeTypeCode: string,
    input: CreateStoreInput,
    actorId: string | null,
  ): Promise<StoreRow>;
  update(
    tenantId: string,
    storeId: string,
    input: UpdateStoreInput,
    actorId: string | null,
  ): Promise<StoreRow | undefined>;
};

export type MasterDataGatewayPort = {
  getStoreTypeById(
    tenantId: string,
    storeTypeId: string,
    bearerToken?: string,
  ): Promise<MasterDataStoreType | null>;
};

export type IndentRepo = {
  findById(tenantId: string, indentId: string): Promise<IndentRow | undefined>;
  findByNumber(tenantId: string, indentNumber: string): Promise<IndentRow | undefined>;
  listLines(tenantId: string, indentId: string): Promise<IndentLineRow[]>;
  linkGrn(tenantId: string, indentId: string, grnId: string): Promise<void>;
};

export type InventoryDeps = {
  storeRepo: StoreRepo;
  masterDataGateway: MasterDataGatewayPort;
};
