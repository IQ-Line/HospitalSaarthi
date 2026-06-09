import { fetchWithTimeout } from "../lib/fetch-with-timeout.js";
import { abdmWarn } from "../lib/abdm-adapter-log.js";
import type {
  CareContextRef,
  HealthRecordBundleEntry,
  RecordFoundationClient,
} from "../ports.js";

type ProjectedCareContextInput = {
  referenceNumber: string;
  display: string;
  hiType: string;
};

const projectedUnlinkedByPatient = new Map<string, CareContextRef[]>();
let devProjectionWarned = false;

function warnDevMemoryProjectionOnce(): void {
  if (devProjectionWarned) return;
  devProjectionWarned = true;
  abdmWarn("abdm.rf.dev_memory_projection", {
    message:
      "Care contexts stored in-process only (Record Foundation ingest not wired). " +
      "Not safe for multi-instance or production — restart clears discover projection.",
  });
}

function projectionKey(iqTenantId: string, patientId: string): string {
  return `${iqTenantId}:${patientId}`;
}

function toCareContextRef(ctx: ProjectedCareContextInput): CareContextRef {
  return {
    id: ctx.referenceNumber,
    referenceNumber: ctx.referenceNumber,
    display: ctx.display,
    hiType: ctx.hiType,
  };
}

function registerProjectedContexts(input: {
  iqTenantId: string;
  patientId: string;
  contexts: ProjectedCareContextInput[];
}): void {
  const key = projectionKey(input.iqTenantId, input.patientId);
  const existing = projectedUnlinkedByPatient.get(key) ?? [];
  const byRef = new Map(existing.map((c) => [c.referenceNumber, c]));
  for (const ctx of input.contexts) {
    byRef.set(ctx.referenceNumber, toCareContextRef(ctx));
  }
  projectedUnlinkedByPatient.set(key, [...byRef.values()]);
}

function listProjectedContexts(iqTenantId: string, patientId: string): CareContextRef[] {
  return [...(projectedUnlinkedByPatient.get(projectionKey(iqTenantId, patientId)) ?? [])];
}

function markProjectedLinked(iqTenantId: string, careContextId: string): void {
  for (const [key, rows] of projectedUnlinkedByPatient) {
    if (!key.startsWith(`${iqTenantId}:`)) continue;
    const next = rows.filter((r) => r.id !== careContextId && r.referenceNumber !== careContextId);
    if (next.length === 0) projectedUnlinkedByPatient.delete(key);
    else projectedUnlinkedByPatient.set(key, next);
  }
}

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

  async registerUnlinkedCareContexts(input: {
    iqTenantId: string;
    patientId: string;
    contexts: ProjectedCareContextInput[];
  }): Promise<void> {
    if (!this.baseUrl) {
      warnDevMemoryProjectionOnce();
    }
    registerProjectedContexts(input);
  }

  async listUnlinkedCareContexts(input: {
    iqTenantId: string;
    patientId: string;
  }): Promise<CareContextRef[]> {
    const projected = listProjectedContexts(input.iqTenantId, input.patientId);
    if (!this.baseUrl) return projected;

    const url = new URL(
      "/api/v1/timeline-index",
      this.baseUrl.replace(/\/+$/, ""),
    );
    url.searchParams.set("patient_id", input.patientId);
    url.searchParams.set("linked", "false");
    const res = await fetchWithTimeout(url.toString(), {
      method: "GET",
      headers: { "x-tenant-id": input.iqTenantId, Accept: "application/json" },
    });
    if (!res.ok) {
      if (projected.length > 0) return projected;
      throw new RecordFoundationHttpError(
        `listUnlinkedCareContexts failed: ${res.status}`,
        res.status,
      );
    }
    const json = (await res.json()) as {
      items?: Array<{ id: string; display?: string; referenceNumber?: string; hiType?: string }>;
    };
    const remote = (json.items ?? []).map((item) => ({
      id: item.id,
      referenceNumber: item.referenceNumber ?? item.id,
      display: item.display ?? item.referenceNumber ?? item.id,
      hiType: item.hiType,
    }));
    const byRef = new Map(projected.map((c) => [c.referenceNumber, c]));
    for (const row of remote) byRef.set(row.referenceNumber, row);
    return [...byRef.values()];
  }

  async markCareContextLinked(input: {
    iqTenantId: string;
    careContextId: string;
  }): Promise<void> {
    if (!this.baseUrl) {
      markProjectedLinked(input.iqTenantId, input.careContextId);
      return;
    }
    markProjectedLinked(input.iqTenantId, input.careContextId);
    const url = `${this.baseUrl.replace(/\/+$/, "")}/api/v1/care-context/${input.careContextId}`;
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
    careContextReferences?: string[];
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
    for (const ref of input.careContextReferences ?? []) {
      url.searchParams.append("care_context_reference", ref);
    }
    const res = await fetchWithTimeout(url.toString(), {
      method: "GET",
      headers: { "x-tenant-id": input.iqTenantId, Accept: "application/json" },
    });
    if (!res.ok) {
      throw new RecordFoundationHttpError(
        `fetchBundlesForConsent failed: ${res.status}`,
        res.status,
      );
    }
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
  }
}

export class NoOpRecordFoundationClient implements RecordFoundationClient {
  async registerUnlinkedCareContexts(input: {
    iqTenantId: string;
    patientId: string;
    contexts: ProjectedCareContextInput[];
  }): Promise<void> {
    registerProjectedContexts(input);
  }

  async listUnlinkedCareContexts(input: {
    iqTenantId: string;
    patientId: string;
  }): Promise<CareContextRef[]> {
    return listProjectedContexts(input.iqTenantId, input.patientId);
  }

  async markCareContextLinked(input: {
    iqTenantId: string;
    careContextId: string;
  }): Promise<void> {
    markProjectedLinked(input.iqTenantId, input.careContextId);
  }

  async fetchBundlesForConsent(): Promise<HealthRecordBundleEntry[]> {
    return [];
  }
}
