/**
 * ABHA Profile DTO — the patient-shaped payload the ABDM gateway returns
 * after KYC + ABHA-creation flows.
 *
 * Mirrors the gateway's documented profile envelope. Used by Integration Hub
 * inbound handlers and EMPI's ABHA-link flow.
 *
 * @see https://sandbox.abdm.gov.in (gateway docs — exact field set varies by
 *      M1/M2 endpoint; this DTO captures the union the platform consumes).
 */

import type { AbhaAddress } from './abha-address.js';
import type { AbhaNumber } from './abha-number.js';
import type { AbhaKycStatus } from './abha-kyc-status.js';

export type Gender = 'M' | 'F' | 'O' | 'U';

export interface AbhaProfile {
  abhaNumber?: AbhaNumber;
  /** First registered ABHA Address (the "primary"). */
  abhaAddress?: AbhaAddress;
  /** Additional alias addresses. */
  abhaAddresses?: AbhaAddress[];
  firstName?: string;
  middleName?: string;
  lastName?: string;
  /** Convenience field gateway sometimes returns; not always populated. */
  fullName?: string;
  gender?: Gender;
  /** Year-only or full DOB; ABDM allows partial dates. */
  dateOfBirth?: {
    year?: number;
    month?: number;
    day?: number;
  };
  mobile?: string;
  email?: string;
  /** Address in ABDM's gateway-specific shape (free-text + state/district codes). */
  address?: {
    line?: string;
    district?: string;
    state?: string;
    pincode?: string;
  };
  kycStatus?: AbhaKycStatus;
  /** Base64-encoded photo (PNG/JPEG); presence varies by KYC flow. */
  profilePhoto?: string;
}
