export type PartnerInboundUpstream = "registration" | "empi" | "configurator" | "master_data";

export type PartnerInboundOperation = {
  method: "GET";
  buildPath: (params: Record<string, string>) => string;
  upstream: PartnerInboundUpstream;
  /** When true, IH mints a partner JWT for the upstream Authorization header. */
  usePartnerJwt: boolean;
};

export const PARTNER_INBOUND_OPERATIONS: Record<string, PartnerInboundOperation> = {
  "registration.listRegistrations": {
    method: "GET",
    buildPath: () => "/api/registration/v1/registrations",
    upstream: "registration",
    usePartnerJwt: true,
  },
  "empi.getPatient": {
    method: "GET",
    buildPath: (params) =>
      `/api/empi/v1/patients/${encodeURIComponent(params.patientId ?? "")}`,
    upstream: "empi",
    usePartnerJwt: true,
  },
  "configurator.listTenants": {
    method: "GET",
    buildPath: () => "/api/configurator/v1/tenants",
    upstream: "configurator",
    usePartnerJwt: true,
  },
  "configurator.listTenantModules": {
    method: "GET",
    buildPath: (params) =>
      `/api/configurator/v1/tenants/${encodeURIComponent(params.tenantId ?? "")}/modules`,
    upstream: "configurator",
    usePartnerJwt: true,
  },
  "masterData.listModules": {
    method: "GET",
    buildPath: () => "/api/v1/master-data/modules",
    upstream: "master_data",
    usePartnerJwt: false,
  },
};
