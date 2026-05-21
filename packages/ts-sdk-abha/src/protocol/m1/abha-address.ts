/**
 * M1 — ABHA Address suggestions + creation during enrolment.
 *
 * NHA:
 *   - `GET /v3/enrollment/enrol/suggestion` + header `Transaction_Id`
 *   - `POST /v3/enrollment/enrol/abha-address`
 *
 * Source: `milestone1.md` §Step 6.
 */

export interface NhaAbhaAddressSuggestionResponse {
  txnId: string;
  abhaAddressList: string[];
}

export interface NhaCreateAbhaAddressBody {
  txnId: string;
  abhaAddress: string;
  preferred: number;
}

export interface NhaCreateAbhaAddressResponse {
  txnId?: string;
  healthIdNumber?: string;
  preferredAbhaAddress?: string;
}

export interface AbhaAddressSuggestionsHimsResponse {
  sessionId: string;
  txnId: string;
  suggestions: string[];
}

export interface CreateAbhaAddressHimsRequest {
  sessionId: string;
  abhaAddress: string;
  /**
   * NHA only documents `1` for this field (omit to default to 1). Other values are rejected before calling NHA.
   */
  preferred?: number;
}

export interface CreateAbhaAddressHimsResponse {
  sessionId: string;
  txnId: string;
  healthIdNumber?: string;
  preferredAbhaAddress?: string;
}
