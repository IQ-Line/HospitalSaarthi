import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq } from "@hims/ts-sdk-db";
import { patientAddresses } from "../schema/tables.js";
import type { AddressRepo } from "../ports.js";
import type {
  PatientAddress,
  CreateAddressData,
  UpdateAddressData,
} from "../domain/patient.types.js";

export class DrizzleAddressRepo implements AddressRepo {
  constructor(private db: DbInstance) {}

  async findByPatient(
    tenantId: string,
    patientId: string,
  ): Promise<PatientAddress[]> {
    const rows = await this.db
      .select()
      .from(patientAddresses)
      .where(
        and(
          eq(patientAddresses.iq_tenant_id, tenantId),
          eq(patientAddresses.patient_id, patientId),
        ),
      );
    return rows as PatientAddress[];
  }

  async create(data: CreateAddressData): Promise<PatientAddress> {
    const rows = await this.db
      .insert(patientAddresses)
      .values({
        iq_tenant_id: data.iq_tenant_id,
        patient_id: data.patient_id,
        address_type: data.address_type,
        street: data.street ?? null,
        city: data.city ?? null,
        district: data.district ?? null,
        state: data.state ?? null,
        pincode: data.pincode ?? null,
        created_by: data.created_by ?? null,
        updated_by: data.created_by ?? null,
      })
      .returning();
    return rows[0] as PatientAddress;
  }

  async update(
    tenantId: string,
    id: string,
    data: UpdateAddressData,
  ): Promise<PatientAddress | undefined> {
    const rows = await this.db
      .update(patientAddresses)
      .set({ ...data, updated_at: new Date() })
      .where(
        and(
          eq(patientAddresses.iq_tenant_id, tenantId),
          eq(patientAddresses.id, id),
        ),
      )
      .returning();
    return (rows[0] as PatientAddress) ?? undefined;
  }
}
