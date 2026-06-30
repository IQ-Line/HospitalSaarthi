import { fetchWithTimeout } from "../lib/fetch-with-timeout.js";
import type {
  CareContextRef,
  HealthRecordBundleEntry,
  RecordFoundationClient,
} from "../ports.js";

export class RecordFoundationHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "RecordFoundationHttpError";
  }
}

export class HttpRecordFoundationClient implements RecordFoundationClient {
  constructor(private readonly baseUrl: string) {}

  async listCareContexts(input: {
    iqTenantId: string;
    patientId: string;
  }): Promise<CareContextRef[]> {
    if (!this.baseUrl) return [];
    const url = new URL(
      "/api/record-foundation/v1/care-contexts",
      this.baseUrl.replace(/\/+$/, ""),
    );
    url.searchParams.set("patient_id", input.patientId);
    url.searchParams.set("status", "active");
    const res = await fetchWithTimeout(url.toString(), {
      method: "GET",
      headers: { "x-tenant-id": input.iqTenantId, Accept: "application/json" },
    });
    if (!res.ok) {
      throw new RecordFoundationHttpError(
        `listCareContexts failed: ${res.status}`,
        res.status,
      );
    }
    const json = (await res.json()) as {
      data?: Array<{
        id: string;
        display?: string;
        source_record_id?: string | null;
        source_record_type?: string;
      }>;
    };
    return (json.data ?? []).map((item) => {
      const referenceNumber = item.source_record_id?.trim() || item.id;
      return {
        id: item.id,
        referenceNumber,
        display: item.display ?? referenceNumber,
        hiType: item.source_record_type,
      };
    });
  }

  async listBundles(input: {
    iqTenantId: string;
    careContextId: string;
  }): Promise<HealthRecordBundleEntry[]> {
    if (!this.baseUrl) return [];
    const encoded = encodeURIComponent(input.careContextId);
    const url = `${this.baseUrl.replace(/\/+$/, "")}/api/record-foundation/v1/care-contexts/${encoded}/bundles`;
    const res = await fetchWithTimeout(url, {
      method: "GET",
      headers: {
        "x-tenant-id": input.iqTenantId,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      throw new RecordFoundationHttpError(
        `listBundles failed: ${res.status}`,
        res.status,
      );
    }
    const json = (await res.json()) as {
      data?: Array<{
        id: string;
        care_context_id: string;
        bundle_json: Record<string, unknown>;
        bundle_kind?: string;
        produced_at?: string;
      }>;
    };
    const rows = json.data ?? [];
    if (rows.length === 0) return [];
    const latest = [...rows].sort(
      (a, b) =>
        new Date(b.produced_at ?? 0).getTime() -
        new Date(a.produced_at ?? 0).getTime(),
    )[0]!;
    return [
      {
        careContextReference: input.careContextId,
        contentJson: JSON.stringify(latest.bundle_json),
        media: "application/fhir+json",
      },
    ];
  }
}

export class NoOpRecordFoundationClient implements RecordFoundationClient {
  async listCareContexts(): Promise<CareContextRef[]> {
    return [];
  }

  async listBundles(): Promise<HealthRecordBundleEntry[]> {
    return [];
  }
}
