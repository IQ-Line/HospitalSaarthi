export interface M3HiuContext {
  /** Gateway REQUEST-ID on consent init (correlates on-init `response.requestId`). */
  outboundRequestId?: string;
  consentRequestId?: string;
  consentArtefactIds?: string[];
  pendingArtefactIds?: string[];
  fetchedArtefactIds?: string[];
  consentId?: string;
  transferId?: string;
  /** Opaque AES-GCM ciphertext stored at rest (e.g. HIU private key JWK). */
  hiuPrivateKeyJwk?: string;
  hiuPublicKeyBase64?: string;
  transferNonceBase64?: string;
  dateRange?: { from: string; to: string };
  cmTransactionId?: string;
  hipPublicKeyBase64?: string;
  hipNonceBase64?: string;
  /** FK to `abdm_m3_data_transfers.transfer_id` after RECORDS_INGESTED. */
  bundleJsonId?: string;
  error?: { code: string; message: string };
}
