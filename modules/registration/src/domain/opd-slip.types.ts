export interface OpdSlipBillingLine {
  description: string;
  amount: string;
}

export interface OpdSlipDocumentPayload {
  facilityName: string;
  facilityMeta: string;
  tokenDisplay: string;
  patientName: string;
  uhid: string;
  ageGender: string;
  phone: string;
  abhaDisplay: string;
  visitNumber: string;
  visitDateTime: string;
  visitTypeLabel: string;
  departmentName: string;
  doctorName: string;
  roomDisplay: string;
  validTillDisplay: string;
  opdDaysDisplay: string;
  billingLines: OpdSlipBillingLine[];
  billingTotal: string | null;
  instructions: string;
}
