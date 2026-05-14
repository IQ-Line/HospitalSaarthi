/**
 * M3 protocol barrel — HIP data transfer + HIU consent & data fetch.
 *
 * HIP-side files describe what the platform handles when records are
 * requested by some external HIU. HIU-side files describe what the platform
 * does when it acts as the requester (typical for an inbound-patient
 * referral with prior consent).
 */

export * from './hip-data-request.js';
export * from './hiu-consent-request.js';
export * from './hiu-consent-status.js';
export * from './hiu-data-fetch.js';
