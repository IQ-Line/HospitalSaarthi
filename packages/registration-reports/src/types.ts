export interface PrintTemplateConfig {
  reportTitle: string;
  facilityName: string;
  facilityId: string;
  facilityEmail: string;
  facilityAddress: string;
  facilityPhone: string;
  footerText?: string;
  logo?: string;
  doctorSignature?: string;
  doctorName?: string;
  doctorDesignation?: string;
  qualification?: string;
  doctorHprId?: string;
}

export interface ReportLayoutConfigResult extends PrintTemplateConfig {
  uploadedLogo: string;
  uploadedSignature: string;
}

export interface PatientInfo {
  name: string;
  uhid: string;
  phone: string;
  visitDate: string;
  visitTime?: string;
  visitNumber?: string;
  visitId?: string;
  attendee?: string;
  abhaNo?: string;
  abhaAddress?: string;
  address?: string;
}

export interface DoctorInfo {
  name: string;
  qualification?: string;
  regNumber?: string;
  department?: string;
  hprId?: string;
  mobNo?: string;
  position?: string;
  designation?: string;
  signature?: string;
  specialization?: string;
}

export interface OPDSlipReportPayload {
  layoutConfig: ReportLayoutConfigResult;
  patientId?: string;
  smartParchaPages?: Array<{ pageNumber: number; content: string }>;
  showDoctorSignature?: boolean;
  smartParchaEnabled?: boolean;
  /** When true, render GIMS facility slip variant. */
  useGimsLayout?: boolean;
  patientData: {
    salutation: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    gender: string;
    age?: number;
    months?: number;
    days?: number;
    dateOfBirth: string;
    phoneNumber: string;
    uhid: string;
    abhaNumber?: string;
    abhaAddress?: string;
    addressForDisplay?: string;
  };
  visitData: {
    visitNumber: string;
    createdAt: string;
    visitType: string;
    consultationType?: string;
    type?: string;
    status: string;
    priority?: string;
    abhaNumber?: string;
    abhaAddress?: string;
    department: { name: string; _id?: string };
    doctor: {
      firstName?: string;
      middleName?: string;
      lastName?: string;
      name?: string;
      _id?: string;
      specialization?: string;
    };
    roomNumber?: string;
    opdDays?: string[];
    tokenNumber?: number;
    fees?: string;
    freeFollowUpValidTill?: string;
    visitValidTill?: string;
  };
  facilityInfo: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    facilityId?: string;
  };
  doctorInfo: DoctorInfo | null;
}

export interface OPDBillingLineItem {
  serviceName: string;
  serviceDetail?: string;
  quantity: number;
  unitPrice: number;
  gstPercent: number;
  discount: number;
}

export interface OPDBillingReceiptPatient {
  nameLine: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface OPDBillingSummary {
  subtotal: number;
  itemWiseDiscount: number;
  billLevelDiscount: number;
  taxAmount: number;
  finalAmount: number;
  receivedAmount: number;
}

export interface OPDBillingPaymentInfo {
  methods: string;
  amountPaid: number;
}

export interface OPDBillingReportPayload {
  layoutConfig: ReportLayoutConfigResult;
  patientInfo: PatientInfo;
  receiptPatient?: OPDBillingReceiptPatient;
  billNumber?: string;
  dateOfIssue?: string;
  receiptTitle?: string;
  lineItems: OPDBillingLineItem[];
  billLevelDiscount?: number;
  billingDiscountPercent?: number;
  payment: OPDBillingPaymentInfo;
  grandTotal: number;
  summary: OPDBillingSummary;
  patientIdForUpload?: string;
  visitNumber?: string;
}
