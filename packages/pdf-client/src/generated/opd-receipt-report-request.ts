// AUTO-GENERATED from contracts/pdf-platform/report-contracts.schema.json — DO NOT EDIT. Run `make gen-report-contracts`.

export interface OpdReceiptReportRequest {
  patientId: string;
  visitId: string;
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
  facility: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    facilityId?: string;
    logoUrl?: string;
    footerText?: string;
  };
  billNumber?: string;
  dateOfIssue?: string;
  receiptTitle?: string;
  lineItems: {
    serviceName: string;
    serviceDetail?: string;
    quantity: number;
    unitPrice: number;
    gstPercent: number;
    discount: number;
  }[];
  billLevelDiscount?: number;
  billingDiscountPercent?: number;
  receivedAmount?: number;
  paymentMethods?: string;
  options?: {
    landscape?: boolean;
    format?: "A4" | "Letter";
    marginTop?: string;
    marginBottom?: string;
    marginLeft?: string;
    marginRight?: string;
  };
}
