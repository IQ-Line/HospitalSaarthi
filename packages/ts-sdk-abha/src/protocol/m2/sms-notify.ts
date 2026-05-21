import type { AbdmGatewayErrorBody } from './common.js';

/** §4.3.8 — outbound SMS notify. */
export interface SmsNotifyRequest {
  requestId: string;
  timestamp: string;
  notification: {
    phoneNo: string;
    hip: { id: string; name?: string };
  };
}

/** §4.3.9 — inbound SMS on-notify (uses `resp`, not `response`). */
export interface OnSmsNotifyCallback {
  requestId?: string;
  timestamp?: string;
  status?: string;
  error?: AbdmGatewayErrorBody;
  resp: { requestId: string };
}
