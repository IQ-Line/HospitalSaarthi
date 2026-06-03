/** NHA profile subset (passthrough from GET /m1/profile). */
export interface NhaAbhaProfile {
  ABHANumber?: string;
  abhaAddress?: string;
  abhaNumber?: string;
  preferredAbhaAddress?: string;
  phrAddress?: string[];
  name?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  gender?: string;
  dob?: string;
  dayOfBirth?: string;
  monthOfBirth?: string;
  yearOfBirth?: string;
  mobile?: string;
  address?: string;
  stateName?: string;
  districtName?: string;
  pinCode?: string;
  stateCode?: string;
  districtCode?: string;
  [key: string]: unknown;
}

export interface AbhaAddressPrefill {
  line1?: string;
  state?: string;
  district?: string;
  pincode?: string;
}

export interface EnrolAadhaarOtpResponse {
  sessionId: string;
  txnId: string;
  message: string;
}

export interface EnrolAadhaarVerifyResponse {
  sessionId: string;
  txnId: string;
  healthIdNumber?: string;
  isNew?: boolean;
  message: string;
  /** True when enrol mobile-verify was bypassed (Aadhaar-linked mobile). */
  mobileVerifySkipped?: boolean;
}

export interface ProfileAccountResponse {
  sessionId: string;
  profile: NhaAbhaProfile;
}

export interface AbhaAddressSuggestionsResponse {
  sessionId: string;
  txnId: string;
  suggestions: string[];
}

export interface CreateAbhaAddressResponse {
  sessionId: string;
  txnId: string;
  healthIdNumber?: string;
  preferredAbhaAddress?: string;
}

export interface EnrolMobileVerifySendOtpResponse {
  sessionId: string;
  txnId: string;
  message: string;
}

export interface EnrolMobileVerifyConfirmResponse {
  sessionId: string;
  txnId: string;
  message: string;
}

export type LoginOtpChannel = 'aadhaar' | 'abha-otp';

export type VerifyAbhaAddressChannel = 'mobile' | 'aadhaar';

export interface LoginAbhaNumberOtpResponse {
  sessionId: string;
  txnId: string;
  message: string;
}

export interface LoginAccountSummary {
  abhaNumber: string;
  preferredAbhaAddress?: string;
  name?: string;
  gender?: string;
  dob?: string;
}

export interface LoginVerifyResponse {
  sessionId: string;
  txnId: string;
  message: string;
  authResult?: string;
  needsUserSelection?: boolean;
  accounts?: LoginAccountSummary[];
}

export interface LoginVerifyUserResponse {
  sessionId: string;
  txnId: string;
  message: string;
}

export interface AbhaProfileDisplay {
  abhaNumber: string;
  abhaAddress: string;
  patientName: string;
  gender: string;
  dateOfBirth: string;
  mobile: string;
  address: string;
}

export interface ProfileAbhaCardResponse {
  sessionId: string;
  card: Record<string, unknown>;
}

/** Payload passed to registration form on wizard success. */
export interface AbhaCreatedPayload {
  sessionId: string;
  abhaNumber: string;
  abhaAddress: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  gender?: 'male' | 'female' | 'other';
  dateOfBirth?: string;
  address?: AbhaAddressPrefill;
}
