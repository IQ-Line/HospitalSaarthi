import type { AbdmGatewayErrorBody, AbdmGatewayResponseRef } from './common.js';

/** §4.3.1 — HIP outbound generate-token. */
export interface GenerateTokenRequest {
  abhaAddress: string;
  abhaNumber?: string;
  name: string;
  gender: 'M' | 'F' | 'O' | 'D';
  yearOfBirth: number;
}

export interface OnGenerateTokenSuccessCallback {
  abhaAddress: string;
  linkToken: string;
  response: AbdmGatewayResponseRef;
}

export interface OnGenerateTokenErrorCallback {
  abhaAddress?: string;
  error: AbdmGatewayErrorBody;
  response: AbdmGatewayResponseRef;
}

export type OnGenerateTokenCallback =
  | OnGenerateTokenSuccessCallback
  | OnGenerateTokenErrorCallback;
