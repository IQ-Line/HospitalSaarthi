import { fetchWithTimeout } from "../lib/fetch-with-timeout.js";
import { abdmWarn } from "../lib/abdm-adapter-log.js";
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

  async listUnlinkedCareContexts(input: {
    iqTenantId: string;
    patientId: string;
  }): Promise<CareContextRef[]> {
    if (!this.baseUrl) return [];
    const url = new URL(
      "/api/record-foundation/v1/care-contexts",
      this.baseUrl.replace(/\/+$/, ""),
    );
    url.searchParams.set("patient_id", input.patientId);
    url.searchParams.set("linked", "false");
    const res = await fetchWithTimeout(url.toString(), {
      method: "GET",
      headers: { "x-tenant-id": input.iqTenantId, Accept: "application/json" },
    });
    if (!res.ok) {
      throw new RecordFoundationHttpError(
        `listUnlinkedCareContexts failed: ${res.status}`,
        res.status,
      );
    }
    const json = (await res.json()) as {
      data?: Array<{
        id: string;
        display?: string;
        abdm_reference_number?: string;
        source_record_type?: string;
      }>;
    };
    return (json.data ?? []).map((item) => ({
      id: item.id,
      referenceNumber: item.abdm_reference_number ?? item.id,
      display: item.display ?? item.abdm_reference_number ?? item.id,
      hiType: item.source_record_type,
    }));
  }

  async markCareContextLinked(input: {
    iqTenantId: string;
    careContextId: string;
  }): Promise<void> {
    if (!this.baseUrl) return;
    const url = `${this.baseUrl.replace(/\/+$/, "")}/api/record-foundation/v1/care-contexts/${input.careContextId}/linkage`;
    const res = await fetchWithTimeout(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-tenant-id": input.iqTenantId,
      },
      body: JSON.stringify({ abha_linkage_status: "linked" }),
    });
    if (!res.ok) {
      abdmWarn("abdm.rf.mark_linked_failed", {
        careContextId: input.careContextId,
        status: res.status,
      });
      throw new RecordFoundationHttpError(
        `markCareContextLinked failed: ${res.status}`,
        res.status,
      );
    }
  }

  async fetchBundlesForConsent(input: {
    iqTenantId: string;
    patientId: string;
    consentId: string;
    dateRange?: { from: string; to: string };
  }): Promise<HealthRecordBundleEntry[]> {
    if (!this.baseUrl) return [];
    const url = `${this.baseUrl.replace(/\/+$/, "")}/api/record-foundation/v1/disclosures`;
    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-tenant-id": input.iqTenantId,
        Accept: "application/json",
      },
      body: JSON.stringify({
        consent_artifact_id: input.consentId,
        patient_id: input.patientId,
        hi_types: [],
        date_range: {
          from: input.dateRange?.from ?? "1970-01-01T00:00:00Z",
          to: input.dateRange?.to ?? "2099-12-31T23:59:59Z",
        },
      }),
    });
    if (!res.ok) {
      throw new RecordFoundationHttpError(
        `fetchBundlesForConsent failed: ${res.status}`,
        res.status,
      );
    }
    const json = (await res.json()) as {
      bundles?: Array<{
        careContextReference: string;
        content: Record<string, unknown>;
        media?: string;
      }>;
    };
    return (json.bundles ?? []).map((e) => ({
      careContextReference: e.careContextReference,
      contentJson: JSON.stringify(e.content),
      media: e.media ?? "application/fhir+json",
    }));
  }

  async ingestExternalRecord(input: {
    iqTenantId: string;
    patientId: string;
    consentArtifactId: string;
    bundleJson: Record<string, unknown>;
    sourceHipId: string;
    sourceHipDisplayName?: string;
    dataEraseAt: string;
  }): Promise<{ externalRecordId: string }> {
    if (!this.baseUrl) return { externalRecordId: "" };
    const url = `${this.baseUrl.replace(/\/+$/, "")}/api/record-foundation/v1/external-records`;
    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-tenant-id": input.iqTenantId,
        Accept: "application/json",
      },
      body: JSON.stringify({
        patient_id: input.patientId,
        consent_artifact_id: input.consentArtifactId,
        bundle_json: input.bundleJson,
        source_hip_id: input.sourceHipId,
        source_hip_display_name: input.sourceHipDisplayName,
        data_erase_at: input.dataEraseAt,
        bundle_kind: input.bundleJson["bundle_kind"] ?? "HealthDocumentRecord",
        fhir_profile_url: input.bundleJson["fhir_profile_url"] ?? "https://nrces.in/ndhm/fhir/r4/StructureDefinition/HealthDocumentRecord",
        fhir_profile_version: input.bundleJson["fhir_profile_version"] ?? "2.0.0",
        produced_at: input.bundleJson["produced_at"] ?? new Date().toISOString(),
      }),
    });
    if (!res.ok) {
      throw new RecordFoundationHttpError(
        `ingestExternalRecord failed: ${res.status}`,
        res.status,
      );
    }
    const json = (await res.json()) as { data?: { id: string } };
    return { externalRecordId: json.data?.id ?? "" };
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

  async ingestExternalRecord(): Promise<{ externalRecordId: string }> {
    return { externalRecordId: "" };
  }
}
