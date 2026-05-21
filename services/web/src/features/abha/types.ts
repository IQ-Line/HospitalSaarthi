/** NHA profile subset (passthrough from GET /m1/profile). */
export interface NhaAbhaProfile {
  ABHANumber?: string;
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
  [key: string]: unknown;
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
}

export interface ProfileAccountResponse {
  sessionId: string;
  profile: NhaAbhaProfile;
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

/** Payload passed to registration form on wizard success. */
export interface AbhaCreatedPayload {
  abhaNumber: string;
  abhaAddress: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  gender?: 'male' | 'female' | 'other';
  dateOfBirth?: string;
}
