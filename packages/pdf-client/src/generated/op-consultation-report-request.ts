// AUTO-GENERATED from contracts/pdf-platform/report-contracts.schema.json — DO NOT EDIT. Run `make gen-report-contracts`.

export interface OpConsultationReportRequest {
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
  vitals?: {
    [k: string]: unknown;
  };
  vitalsV2?: {
    [k: string]: unknown;
  }[];
  vitalsSchemaVersion?: number;
  vitalsMasterDisplay?: {
    [k: string]: unknown;
  };
  complaints?: {
    [k: string]: unknown;
  }[];
  familyHistory?: {
    [k: string]: unknown;
  }[];
  allergyDetails?: {
    [k: string]: unknown;
  }[];
  diagnoses?: {
    [k: string]: unknown;
  }[];
  medicines?: {
    [k: string]: unknown;
  }[];
  tests?: {
    [k: string]: unknown;
  }[];
  imaging?: {
    [k: string]: unknown;
  }[];
  procedures?: {
    [k: string]: unknown;
  }[];
  carePlan?: {
    [k: string]: unknown;
  };
  immunizations?: {
    vaccine?: string;
    vaccineName?: string;
    manufacturer?: string;
    lotNo?: string;
    lotNumber?: string;
    dateOfDose?: string;
    nextDueDate?: string;
    nextDueDoseDate?: string;
    vaccinatedBy?: string;
    doseNumber?: number;
  }[];
  medicalHistory?: {
    [k: string]: unknown;
  };
  physicalActivity?: {
    [k: string]: unknown;
  }[];
  womensHealth?: {
    [k: string]: unknown;
  };
}
