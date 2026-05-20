/** Base inbound gateway headers (ABDM v3 callbacks). */
export interface InboundGatewayHeadersBase {
  'request-id': string;
  timestamp: string;
  authorization?: string;
}

/** HIP-side inbound callbacks. */
export interface HipInboundHeaders extends InboundGatewayHeadersBase {
  'x-hip-id': string;
  'x-cm-id'?: string;
}

/** HIU-side inbound callbacks (e.g. link/confirm). */
export interface HiuInboundHeaders extends InboundGatewayHeadersBase {
  'x-hiu-id': string;
  'x-cm-id'?: string;
}
