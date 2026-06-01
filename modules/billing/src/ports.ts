import type {
  BillItemRow,
  BillRow,
  BillWithItems,
  ListBillsQuery,
  ListBillsResult,
  PaymentRow,
} from "./domain/bill.types.js";
import type {
  BulkUpsertProviderConsultationTariffsInput,
  ListProviderConsultationTariffsQuery,
  ProviderConsultationTariffItemInput,
} from "./domain/consultation-tariff.types.js";
import type {
  TariffMasterRow,
  UpdateTariffServiceInput,
} from "./domain/tariff-master.types.js";
import type { ConsultationTariffReferenceValidator } from "./ports/consultation-tariff-reference.js";

export type { ConsultationTariffReferenceValidator } from "./ports/consultation-tariff-reference.js";
export { createPermissiveConsultationTariffReferenceValidator } from "./ports/consultation-tariff-reference.js";

export type TariffMasterUpdatePatch = Omit<
  UpdateTariffServiceInput,
  "effective_from" | "effective_to"
> & {
  effective_from?: Date | string;
  effective_to?: Date | string | null;
  updated_by?: string | null;
};

export type UpsertProviderConsultationTariffInput = ProviderConsultationTariffItemInput & {
  provider_id: string;
  service_code: string;
  service_name: string;
  department_label: string | null;
};

export interface TariffMasterRepo {
  findById(tenantId: string, id: string): Promise<TariffMasterRow | undefined>;
  findByCodeAndProvider(
    tenantId: string,
    serviceCode: string,
    providerId: string | null,
  ): Promise<TariffMasterRow | undefined>;
  findActiveRegistrationFee(
    tenantId: string,
    excludeId?: string,
  ): Promise<TariffMasterRow | undefined>;
  findActiveProviderDepartmentTariff(
    tenantId: string,
    query: {
      provider_id: string;
      department_id?: string | null;
      department?: string | null;
      excludeId?: string;
    },
  ): Promise<TariffMasterRow | undefined>;
  resolveConsultationTariff(
    tenantId: string,
    providerId: string,
    departmentId: string,
    consultationTypeId: string,
    at?: Date,
  ): Promise<TariffMasterRow | undefined>;
  upsertProviderConsultationTariff(
    tenantId: string,
    input: UpsertProviderConsultationTariffInput,
  ): Promise<TariffMasterRow>;
  listProviderConsultationTariffs(
    tenantId: string,
    query: ListProviderConsultationTariffsQuery,
  ): Promise<TariffMasterRow[]>;
  hasOverlappingConsultationTariff(
    tenantId: string,
    providerId: string,
    departmentId: string,
    consultationTypeId: string,
    effectiveFrom: Date,
    effectiveTo: Date | null,
    excludeId?: string,
  ): Promise<boolean>;
  bulkUpsertProviderConsultationTariffs(
    tenantId: string,
    input: BulkUpsertProviderConsultationTariffsInput,
    buildRow: (item: ProviderConsultationTariffItemInput) => UpsertProviderConsultationTariffInput,
  ): Promise<TariffMasterRow[]>;
  update(
    tenantId: string,
    id: string,
    patch: TariffMasterUpdatePatch,
  ): Promise<TariffMasterRow | undefined>;
}

export interface ConsultationTypesRepo {
  findById(tenantId: string, id: string): Promise<{ id: string; code: string; display_name: string } | undefined>;
  listActive(tenantId: string): Promise<Array<{ id: string; code: string; display_name: string }>>;
  ensureDefaultTypes(tenantId: string): Promise<void>;
}

export interface BillingRepo {
  findItemByIdempotency(tenantId: string, key: string): Promise<BillItemRow | undefined>;
  findDraftBill(
    tenantId: string,
    patientId: string,
    visitId: string | null,
  ): Promise<BillRow | undefined>;
  getBill(tenantId: string, billId: string): Promise<BillWithItems | undefined>;
  createBill(row: NewBillRow): Promise<BillRow>;
  insertItem(row: NewBillItemRow): Promise<BillItemRow>;
  updateBill(
    tenantId: string,
    billId: string,
    patch: Partial<BillRow>,
  ): Promise<BillRow | undefined>;
  listActiveItems(tenantId: string, billId: string): Promise<BillItemRow[]>;
  listBills(tenantId: string, query: ListBillsQuery): Promise<ListBillsResult>;
  insertPayment(row: NewPaymentRow): Promise<PaymentRow>;
}

export type NewBillRow = Omit<BillRow, "id" | "created_at" | "updated_at">;
export type NewBillItemRow = Omit<BillItemRow, "id" | "created_at" | "updated_at">;
export type NewPaymentRow = Omit<PaymentRow, "id" | "created_at" | "updated_at">;

export interface ConsultationTariffDeps {
  tariffRepo: TariffMasterRepo;
  consultationTypesRepo: ConsultationTypesRepo;
  referenceValidator: ConsultationTariffReferenceValidator;
}

export interface BillingDeps {
  tariffRepo: TariffMasterRepo;
  billingRepo: BillingRepo;
}
