import type { HipHealthInformationRequest } from "@hims/ts-sdk-abha/protocol/m3";

export interface ParsedHiRequest {
  consentId: string;
  transactionId: string;
  dataPushUrl: string;
  dateRange?: { from: string; to: string };
  peerPublicKey: string;
  peerNonce: string;
  keyExpiry?: string;
  /** Echo on outbound push so PHR decrypt matches inbound HIU keyMaterial shape. */
  peerCryptoAlg?: string;
  peerCurve?: string;
  peerParameters?: string;
}

export function parseHiRequestBody(
  body: HipHealthInformationRequest,
  inboundRequestId: string,
): ParsedHiRequest | null {
  const hi = body.hiRequest;
  const consentId =
    hi?.consent?.id ?? body.consentId ?? (body as { consent?: { id: string } }).consent?.id;
  const dataPushUrl = hi?.dataPushUrl;
  const peerPublicKey = hi?.keyMaterial?.dhPublicKey?.keyValue ?? "";
  const peerNonce = hi?.keyMaterial?.nonce ?? "";
  const transactionId =
    body.transactionId ?? hi?.transactionId ?? inboundRequestId;
  if (!consentId || !dataPushUrl || !peerPublicKey || !peerNonce) {
    return null;
  }
  return {
    consentId: String(consentId),
    transactionId: String(transactionId),
    dataPushUrl: String(dataPushUrl),
    dateRange: hi?.dateRange,
    peerPublicKey: String(peerPublicKey),
    peerNonce: String(peerNonce),
    keyExpiry: hi?.keyMaterial?.dhPublicKey?.expiry,
    peerCryptoAlg: hi?.keyMaterial?.cryptoAlg,
    peerCurve: hi?.keyMaterial?.curve,
    peerParameters: hi?.keyMaterial?.dhPublicKey?.parameters,
  };
}
