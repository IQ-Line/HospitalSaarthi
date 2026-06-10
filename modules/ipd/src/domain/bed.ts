export type BedStatus =
  | "available"
  | "reserved"
  | "occupied"
  | "cleaning_pending"
  | "maintenance_blocked";

export interface Bed {
  id: string;
  iq_tenant_id: string;
  ward_id: string;
  bed_code: string;
  bed_status: BedStatus;
  current_patient_id: string | null;
  current_episode_id: string | null;
  reserved_for_episode_id: string | null;
}
