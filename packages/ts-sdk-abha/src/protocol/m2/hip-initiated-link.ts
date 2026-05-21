import type {
  AbdmGatewayErrorBody,
  AbdmGatewayResponseRef,
  AbdmPatientCareContexts,
  LinkCareContextHiType,
} from './common.js';

/** §4.3.3 — HIP outbound link/carecontext. */
export interface LinkCareContextRequest {
  abhaAddress: string;
  abhaNumber?: string;
  patient: Array<
    Omit<AbdmPatientCareContexts, 'hiType'> & { hiType: LinkCareContextHiType }
  >;
}

export interface OnLinkCareContextSuccessCallback {
  abhaAddress: string;
  status: string;
  response: AbdmGatewayResponseRef;
}

export interface OnLinkCareContextErrorCallback {
  error: AbdmGatewayErrorBody;
  response: AbdmGatewayResponseRef;
  abhaAddress?: string;
  status?: string;
}

export type OnLinkCareContextCallback =
  | OnLinkCareContextSuccessCallback
  | OnLinkCareContextErrorCallback;
