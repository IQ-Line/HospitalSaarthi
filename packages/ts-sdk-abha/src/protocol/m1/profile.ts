/**
 * M1 — ABHA profile + card reads (`x_token` from enrolment).
 *
 * NHA: `GET /v3/profile/account`, `GET /v3/profile/account/abha-card`
 * Headers: gateway `Authorization` + `X-token: Bearer <profile JWT>`.
 */

/** NHA profile/account response (subset; passthrough-friendly). */
export type NhaProfileAccountResponse = Record<string, unknown>;

export interface NhaAbhaCardResponse {
  /** Base64-encoded card asset (PDF/PNG per NHA environment). */
  data?: string;
  format?: string;
  [key: string]: unknown;
}

export interface ProfileAccountHimsResponse {
  sessionId: string;
  profile: NhaProfileAccountResponse;
}

export interface ProfileAbhaCardHimsResponse {
  sessionId: string;
  card: NhaAbhaCardResponse;
}
