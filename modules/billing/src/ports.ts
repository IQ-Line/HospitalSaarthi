import type {
  BillItemRow,
  BillRow,
  BillWithItems,
  PaymentRow,
} from "./domain/bill.types.js";
import type {
  TariffMasterRow,
  UpdateTariffServiceInput,
} from "./domain/tariff-master.types.js";

export type TariffMasterUpdatePatch = Omit<
  UpdateTariffServiceInput,
  "effective_from" | "effective_to"
> & {
  effective_from?: Date | string;
  effective_to?: Date | string | null;
  updated_by?: string | null;
};

export interface TariffMasterRepo {
  findById(tenantId: string, id: string): Promise<TariffMasterRow | undefined>;
  findByCodeAndProvider(
    tenantId: string,
    serviceCode: string,
    providerId: string | null,
  ): Promise<TariffMasterRow | undefined>;
  update(
    tenantId: string,
    id: string,
    patch: TariffMasterUpdatePatch,
  ): Promise<TariffMasterRow | undefined>;
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
  insertPayment(row: NewPaymentRow): Promise<PaymentRow>;
}

export type NewBillRow = Omit<BillRow, "id" | "created_at" | "updated_at">;
export type NewBillItemRow = Omit<BillItemRow, "id" | "created_at" | "updated_at">;
export type NewPaymentRow = Omit<PaymentRow, "id" | "created_at" | "updated_at">;

export interface BillingDeps {
  tariffRepo: TariffMasterRepo;
  billingRepo: BillingRepo;
}
