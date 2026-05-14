/**
 * M2 protocol barrel — care-context discovery / link / consent.
 *
 * All M2 flows are HIP-side: inbound callbacks from the gateway with our
 * outbound replies pushed to the gateway's `on-*` endpoints.
 */

export * from './discovery.js';
export * from './link-init.js';
export * from './link-confirm.js';
export * from './consent-notify.js';
export * from './care-context-publish.js';
