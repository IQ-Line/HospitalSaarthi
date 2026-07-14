export type PharmacyStoreAssignmentKind = "primary" | "secondary";

export type PharmacyStoreAccessInput = {
  primary_store_id: string;
  secondary_store_ids?: string[];
};

export type PharmacyStoreAssignmentRow = {
  store_id: string;
  assignment_kind: PharmacyStoreAssignmentKind;
};

export type PharmacyStoreAccessSnapshot = {
  primary_store_id: string | null;
  secondary_store_ids: string[];
};
