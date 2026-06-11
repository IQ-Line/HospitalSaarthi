import type { OpdPrescriptionMedicineLine, OpdPrescriptionSnapshot } from "../domain/pharmacy.types.js";
import { clinicalSummaryFromFormData } from "./opd-clinical-summary.js";
import { extractPrescriptionMedicineId } from "./filter-tenant-catalog-medicines.js";
import type { OpdGatewayPort } from "../ports.js";
import { truncateUpstreamBody } from "./upstream-log.js";

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

function tenantHeaders(tenantId: string, bearerToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    iq_tenant_id: tenantId,
    "x-tenant-id": tenantId,
  };
  if (bearerToken?.trim()) {
    headers.Authorization = `Bearer ${bearerToken.trim()}`;
  }
  return headers;
}

type OpdPrescriptionResponse = {
  prescription_id: string;
  visit_id: string;
  patient_id: string;
  visit_status: string;
  prescription_status: string;
  doctor_id?: string | null;
  finalized_at?: string | null;
  form_data?: Record<string, unknown>;
};

function mapMedicineLine(row: Record<string, unknown>, index: number): OpdPrescriptionMedicineLine {
  let duration: string | null = null;
  if (row.days != null) {
    duration = String(row.days);
  } else if (row.duration != null) {
    duration = String(row.duration);
  }

  return {
    line_no: index + 1,
    medicine_id: extractPrescriptionMedicineId(row),
    name: String(row.medicine ?? row.name ?? ""),
    strength: row.strength != null ? String(row.strength) : null,
    dosage: row.dosage != null ? String(row.dosage) : null,
    duration,
    frequency: row.frequency != null ? String(row.frequency) : null,
    quantity: row.quantity != null ? String(row.quantity) : null,
    route: row.route != null ? String(row.route) : null,
  };
}

export class HttpOpdGateway implements OpdGatewayPort {
  constructor(
    private readonly baseUrl: string,
    private readonly options?: {
      warn?: (detail: Record<string, unknown>, message: string) => void;
    },
  ) {}

  async getVisitPrescription(
    tenantId: string,
    visitId: string,
    bearerToken?: string,
  ): Promise<OpdPrescriptionSnapshot | null> {
    const url = joinUrl(
      this.baseUrl,
      `/api/v1/opd/visits/${encodeURIComponent(visitId)}/prescription`,
    );

    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers: tenantHeaders(tenantId, bearerToken),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.options?.warn?.({ tenantId, visitId, message }, "OPD get prescription failed");
      throw error;
    }

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const body = await response.text();
      this.options?.warn?.(
        { tenantId, visitId, status: response.status, body: truncateUpstreamBody(body) },
        "OPD get prescription rejected",
      );
      throw new Error(`OPD prescription fetch failed (${response.status})`);
    }

    const payload = (await response.json()) as OpdPrescriptionResponse;
    const formData = payload.form_data ?? {};
    const rawMedicines = formData.medicines ?? [];
    const medicines = (Array.isArray(rawMedicines) ? rawMedicines : [])
      .filter((row): row is Record<string, unknown> => row != null && typeof row === "object")
      .map(mapMedicineLine);
    const clinical = clinicalSummaryFromFormData(formData);

    return {
      prescription_id: payload.prescription_id,
      visit_id: payload.visit_id,
      patient_id: payload.patient_id,
      visit_status: payload.visit_status,
      prescription_status: payload.prescription_status,
      doctor_id: payload.doctor_id ?? null,
      doctor_name: null,
      finalized_at:
        payload.finalized_at == null
          ? null
          : typeof payload.finalized_at === "string"
            ? payload.finalized_at
            : new Date(payload.finalized_at).toISOString(),
      vitals_summary: clinical.vitals_summary,
      complaints_summary: clinical.complaints_summary,
      diagnosis_summary: clinical.diagnosis_summary,
      medicines,
    };
  }
}
