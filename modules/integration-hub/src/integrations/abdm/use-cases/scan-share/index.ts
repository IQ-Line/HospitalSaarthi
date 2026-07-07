/**
 * Barrel for the ABDM scan-and-share use-cases. One function per operation,
 * deps (repo, gateway, empi, clock) injected as the second argument.
 */

export { issueShareToken, type IssueShareTokenDeps } from "./issue-share-token.js";
export { getShareStatus, type ScanShareStatusData } from "./get-share-status.js";
export { listActiveShares } from "./list-active-shares.js";
export { lookupShareToken } from "./lookup-share-token.js";
export { prefillFromToken } from "./prefill-from-token.js";
export { redeemShareToken } from "./redeem-share-token.js";
export { buildRegistrationPrefill, type ResolvedShareToken } from "./profile-mapping.js";
export type { ScanShareRepository, ShareIssuance } from "./ports.js";
