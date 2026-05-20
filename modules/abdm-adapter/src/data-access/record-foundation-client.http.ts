import { fetchWithTimeout } from "../lib/fetch-with-timeout.js";
import type {
  CareContextRef,
  HealthRecordBundleEntry,
  RecordFoundationClient,
} from "../ports.js";

export class HttpRecordFoundationClient implements RecordFoundationClient {
  constructor(private readonly baseUrl: string) {}

  async listUnlinkedCareContexts(input: {
    iqTenantId: string;
    patientId: string;
  }): Promise<CareContextRef[]> {
    if (!this.baseUrl) return [];
    const url = new URL(
      "/api/v1/timeline-index",
      this.baseUrl.replace(/\/+$/, ""),
    );
    url.searchParams.set("patient_id", input.patientId);
    url.searchParams.set("linked", "false");
    try {
      const res = await fetchWithTimeout(url.toString(), {
        method: "GET",
        headers: { "x-tenant-id": input.iqTenantId, Accept: "application/json" },
      });
      if (!res.ok) return [];
      const json = (await res.json()) as {
        items?: Array<{ id: string; display?: string; referenceNumber?: string }>;
      };
      return (json.items ?? []).map((item) => ({
        id: item.id,
        referenceNumber: item.referenceNumber ?? item.id,
        display: item.display ?? item.referenceNumber ?? item.id,
      }));
    } catch {
      return [];
    }
  }

  async markCareContextLinked(input: {
    iqTenantId: string;
    careContextId: string;
  }): Promise<void> {
    if (!this.baseUrl) return;
    const url = `${this.baseUrl.replace(/\/+$/, "")}/api/v1/care-context/${input.careContextId}`;
    try {
      await fetchWithTimeout(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": input.iqTenantId,
        },
        body: JSON.stringify({ abha_linkage_status: "linked" }),
      });
    } catch {
      /* best-effort until RF API is wired */
    }
  }

  async fetchBundlesForConsent(input: {
    iqTenantId: string;
    patientId: string;
    consentId: string;
    dateRange?: { from: string; to: string };
  }): Promise<HealthRecordBundleEntry[]> {
    if (!this.baseUrl) return [];
    const url = new URL(
      "/api/v1/disclosure/bundles",
      this.baseUrl.replace(/\/+$/, ""),
    );
    url.searchParams.set("patient_id", input.patientId);
    url.searchParams.set("consent_id", input.consentId);
    if (input.dateRange?.from) url.searchParams.set("from", input.dateRange.from);
    if (input.dateRange?.to) url.searchParams.set("to", input.dateRange.to);
    try {
      const res = await fetchWithTimeout(url.toString(), {
        method: "GET",
        headers: { "x-tenant-id": input.iqTenantId, Accept: "application/json" },
      });
      if (!res.ok) return [];
      const json = (await res.json()) as {
        entries?: Array<{
          careContextReference: string;
          content: string;
          media?: string;
        }>;
      };
      return (json.entries ?? []).map((e) => ({
        careContextReference: e.careContextReference,
        contentJson: e.content,
        media: e.media ?? "application/fhir+json",
      }));
    } catch {
      return [];
    }
  }
}

export class NoOpRecordFoundationClient implements RecordFoundationClient {
  async listUnlinkedCareContexts(): Promise<CareContextRef[]> {
    return [];
  }

  async markCareContextLinked(): Promise<void> {
    /* no-op */
  }

  async fetchBundlesForConsent(): Promise<HealthRecordBundleEntry[]> {
    return [];
  }
}
