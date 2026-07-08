// AUTO-GENERATED from contracts/pdf-platform/report-contracts.schema.json — DO NOT EDIT. Run `make gen-report-contracts`.

export interface PrescriptionReportRequest {
  facility: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    facilityId?: string;
    logoUrl?: string;
    footerText?: string;
  };
  patient: {
    name: string;
    uhid: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    yearOfBirth?: number;
    gender?: string;
    salutation?: string;
    abhaNumber?: string;
    abhaAddress?: string;
    address?: string;
  };
  visit: {
    visitNumber?: string;
    createdAt: string;
    visitType?: string;
    status?: string;
    departmentName?: string;
    roomNumber?: string;
    tokenNumber?: number;
    fees?: string;
    visitValidTill?: string;
    consultationType?: string;
    priority?: string;
  };
  doctor: {
    name: string;
    qualification?: string;
    specialization?: string;
    hprId?: string;
    regNumber?: string;
    signature?: string;
  };
  options?: {
    landscape?: boolean;
    format?: "A4" | "Letter";
    marginTop?: string;
    marginBottom?: string;
    marginLeft?: string;
    marginRight?: string;
  };
  diagnoses?: {
    id: string;
    notes: string;
    certainty?: "confirmed" | "presumed" | "";
  }[];
  medicines?: {
    id: string;
    name: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    instructions?: string;
    category?: string;
    strength?: string;
    form?: string;
    volume?: string;
    quantity?: string | number;
    sos?: string;
    type?: string;
    route?: string;
    method?: string;
  }[];
}
