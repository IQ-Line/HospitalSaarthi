/**
 * Repository port for ABDM scan-and-share token issuance / redemption.
 *
 * Co-located with the scan-share use-cases (rather than the central `ports.ts`)
 * because it is a self-contained slice: only these use-cases and the Drizzle
 * adapter in `../../data-access/abdm-scan-share.repo.ts` reference it. Time
 * windows (`since`, `issueDate`, `expiresAt`) are computed by the use-cases and
 * passed in, so the repo is pure data-access and the use-cases stay clock-injectable.
 */

/** One row of `integration_hub.abdm_share_token_issuances` (subset the flow reads). */
export interface ShareIssuance {
  id: string;
  token_number: number;
  abha_address: string;
  profile_json: Record<string, unknown>;
  patient_id: string | null;
  issued_at: Date;
}

export interface ScanShareRepository {
  /** SELECT LIMIT 0 probe — false when the scan-share tables are not migrated. */
  tablesExist(): Promise<boolean>;

  /** Latest un-redeemed issuance for an ABHA within the active window (dedupe). */
  findActiveByAbha(input: {
    iqTenantId: string;
    facilityIdRef: string;
    abhaAddress: string;
    since: Date;
  }): Promise<ShareIssuance | null>;

  /** Atomically bump the per-facility/day counter and insert the issuance row. */
  allocateToken(input: {
    iqTenantId: string;
    integrationId: string;
    facilityIdRef: string;
    abhaAddress: string;
    profile: Record<string, unknown>;
    patientId: string | null;
    issueDate: string;
    expiresAt: Date;
  }): Promise<ShareIssuance>;

  /** Active issuances for the day (token ASC) plus the running (oldest) token number. */
  listActive(input: {
    iqTenantId: string;
    facilityIdRef: string;
    issueDate: string;
    since: Date;
  }): Promise<{ rows: ShareIssuance[]; runningToken: number }>;

  findByToken(input: {
    iqTenantId: string;
    facilityIdRef: string;
    issueDate: string;
    tokenNumber: number;
    since: Date;
  }): Promise<ShareIssuance | null>;

  /** Numeric query resolves by token; otherwise LIKE-matches abha address / number. */
  findByQuery(input: {
    iqTenantId: string;
    facilityIdRef: string;
    issueDate: string;
    query: string;
    since: Date;
  }): Promise<ShareIssuance | null>;

  /** Mark redeemed + inactive. Returns false when nothing matched (already redeemed / not found). */
  redeem(input: {
    iqTenantId: string;
    facilityIdRef: string;
    issueDate: string;
    tokenNumber: number;
  }): Promise<boolean>;
}
