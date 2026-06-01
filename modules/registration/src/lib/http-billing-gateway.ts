import type { BillingReadPort, BillingBillSummary } from "../ports.js";

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

type BillsListWire = {
  data?: Array<{
    id: string;
    bill_number: string;
    net_amount: string;
    status: string;
  }>;
};

export class HttpBillingGateway implements BillingReadPort {
  constructor(private readonly billingServiceOrigin: string) {}

  async listBillsForRegistration(
    tenantId: string,
    registrationId: string,
    options?: { bearerToken?: string; visitId?: string | null },
  ): Promise<BillingBillSummary[]> {
    const bySource = await this.fetchBills(tenantId, registrationId, options);
    if (bySource.length > 0) {
      return bySource;
    }
    if (options?.visitId) {
      return this.fetchBills(tenantId, registrationId, options, { visitIdOnly: true });
    }
    return [];
  }

  private async fetchBills(
    tenantId: string,
    registrationId: string,
    options: { bearerToken?: string; visitId?: string | null } | undefined,
    mode?: { visitIdOnly: true },
  ): Promise<BillingBillSummary[]> {
    const params = new URLSearchParams({ limit: "10" });
    if (mode?.visitIdOnly && options?.visitId) {
      params.set("visit_id", options.visitId);
    } else {
      params.set("source_module", "registration");
      params.set("source_ref", registrationId);
    }

    const headers: Record<string, string> = {
      iq_tenant_id: tenantId,
      "x-tenant-id": tenantId,
      Accept: "application/json",
    };
    if (options?.bearerToken) {
      headers.Authorization = `Bearer ${options.bearerToken}`;
    }

    const url = joinUrl(
      this.billingServiceOrigin,
      `/api/billing/v1/bills?${params.toString()}`,
    );

    let res: Response;
    try {
      res = await fetch(url, { headers });
    } catch {
      return [];
    }

    if (!res.ok) {
      return [];
    }

    const json = (await res.json()) as BillsListWire;
    return (json.data ?? []).map((row) => ({
      billId: row.id,
      billNumber: row.bill_number,
      netAmount: row.net_amount,
      status: row.status,
    }));
  }
}
