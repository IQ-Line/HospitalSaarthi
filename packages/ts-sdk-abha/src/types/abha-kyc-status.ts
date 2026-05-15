/**
 * ABHA KYC status.
 *
 * - `verified`     — ABDM has verified identity (Aadhaar/PAN/DL).
 * - `pending`      — KYC initiated, awaiting completion.
 * - `failed`       — KYC attempt rejected.
 * - `not-required` — flow path that doesn't demand KYC (e.g. some legacy links).
 */

export type AbhaKycStatus = 'verified' | 'pending' | 'failed' | 'not-required';
