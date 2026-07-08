// AUTO-GENERATED from contracts/pdf-platform/report-contracts.schema.json — DO NOT EDIT. Run `make gen-report-contracts`.

export interface OpdSlipReportRequest {
  patientId: string;
  visitId: string;
  doctorId?: string;
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
  facility: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    facilityId?: string;
    logoUrl?: string;
    footerText?: string;
  };
  smartParchaEnabled?: boolean;
  smartParchaPages?: {
    pageNumber: number;
    content: string;
  }[];
  showDoctorSignature?: boolean;
  options?: {
    landscape?: boolean;
    format?: "A4" | "Letter";
    marginTop?: string;
    marginBottom?: string;
    marginLeft?: string;
    marginRight?: string;
  };
}
