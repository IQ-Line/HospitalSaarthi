export interface DisclosureRequest {
  consent_artifact_id: string;
  patient_id: string;
  hi_types: string[];
  date_range: {
    from: string;
    to: string;
  };
  care_context_ids?: string[];
}

export interface DisclosureEntry {
  careContextReference: string;
  content: Record<string, unknown>;
  media: string;
}

export interface DisclosureResponse {
  bundles: DisclosureEntry[];
  excluded: Array<{
    care_context_id: string;
    reason: "outside_date_range" | "hi_type_mismatch" | "sensitivity_blocked" | "not_disclosable" | "erased";
  }>;
}
