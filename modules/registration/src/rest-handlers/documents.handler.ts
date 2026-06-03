import type { FastifyInstance } from "fastify";
import type { PdfRendererPort } from "@hims/pdf-client";
import type { BillingReadPort, RegistrationRepo, VisitRepo } from "../ports.js";
import {
  getOpdReceiptHtml,
  getOpdReceiptPdf,
  getOpdSlipHtml,
  getOpdSlipPdf,
} from "../use-cases/get-registration-documents.js";
import type { ReportDocumentContext } from "../lib/report-document-context.js";
import { paramsRegistrationIdSchema } from "./route-schemas.js";

export interface DocumentsHandlerDeps {
  registrationRepo: RegistrationRepo;
  visitRepo: VisitRepo;
  billingReadPort: BillingReadPort | undefined;
  pdfRenderer: PdfRendererPort | undefined;
  defaultReportWebOrigin?: string;
  defaultReportLogoUrl?: string;
}

type DocumentQuery = {
  bill_id?: string;
  department_name?: string;
  doctor_name?: string;
  room_number?: string;
  patient_address?: string;
  payment_method?: string;
  facility_name?: string;
  facility_id?: string;
  facility_address?: string;
  facility_phone?: string;
  facility_email?: string;
};

function readBearerToken(authHeader: string | undefined): string | undefined {
  return authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
}

function readRequestId(header: string | string[] | undefined): string | undefined {
  if (typeof header === "string") return header;
  if (Array.isArray(header)) return header[0];
  return undefined;
}

function documentContextFromRequest(
  deps: DocumentsHandlerDeps,
  request: { headers: { authorization?: string; "x-request-id"?: string | string[] }; query: DocumentQuery },
): ReportDocumentContext {
  const q = request.query;
  return {
    bearerToken: readBearerToken(request.headers.authorization),
    requestId: readRequestId(request.headers["x-request-id"]),
    webOrigin: deps.defaultReportWebOrigin,
    logoUrl: deps.defaultReportLogoUrl,
    facilityName: q.facility_name,
    facilityId: q.facility_id,
    facilityAddress: q.facility_address,
    facilityPhone: q.facility_phone,
    facilityEmail: q.facility_email,
    departmentName: q.department_name,
    doctorName: q.doctor_name,
    roomNumber: q.room_number,
    patientAddress: q.patient_address,
    paymentMethod: q.payment_method,
    billId: q.bill_id,
  };
}

function sendDocumentError(
  reply: { code: (n: number) => { send: (body: unknown) => unknown } },
  result: { code: string; message?: string },
) {
  if (result.code === "NOT_FOUND") {
    return reply.code(404).send({ error: "Registration not found" });
  }
  if (result.code === "NOT_PRINTABLE") {
    return reply.code(409).send({
      error: "registration_not_printable",
      message: result.message,
    });
  }
  if (result.code === "BILL_NOT_FOUND") {
    return reply.code(404).send({ error: "bill_not_found", message: result.message });
  }
  return reply.code(503).send({
    error: "pdf_renderer_unavailable",
    message: result.message ?? "Document render unavailable",
  });
}

export function registerDocumentsHandler(app: FastifyInstance, deps: DocumentsHandlerDeps): void {
  const handlerDeps = {
    registrationRepo: deps.registrationRepo,
    visitRepo: deps.visitRepo,
    billingReadPort: deps.billingReadPort,
    pdfRenderer: deps.pdfRenderer,
  };

  app.get<{ Params: { registrationId: string }; Querystring: DocumentQuery }>(
    "/registrations/:registrationId/documents/opd-slip.html",
    {
      config: { authMode: "protected" as const },
      schema: { params: paramsRegistrationIdSchema },
    },
    async (request, reply) => {
      const context = documentContextFromRequest(deps, request);
      const result = await getOpdSlipHtml(
        handlerDeps,
        request.tenantId,
        request.params.registrationId,
        context,
      );
      if (!result.ok) return sendDocumentError(reply, result);
      return reply.header("Content-Type", "text/html; charset=utf-8").send(result.data);
    },
  );

  app.get<{ Params: { registrationId: string }; Querystring: DocumentQuery }>(
    "/registrations/:registrationId/documents/opd-receipt.html",
    {
      config: { authMode: "protected" as const },
      schema: { params: paramsRegistrationIdSchema },
    },
    async (request, reply) => {
      const billId = request.query.bill_id?.trim();
      if (!billId) {
        return reply.code(400).send({ error: "bill_id_required" });
      }
      const context = documentContextFromRequest(deps, request);
      const result = await getOpdReceiptHtml(
        handlerDeps,
        request.tenantId,
        request.params.registrationId,
        billId,
        context,
      );
      if (!result.ok) return sendDocumentError(reply, result);
      return reply.header("Content-Type", "text/html; charset=utf-8").send(result.data);
    },
  );

  app.get<{ Params: { registrationId: string }; Querystring: DocumentQuery }>(
    "/registrations/:registrationId/documents/opd-slip.pdf",
    {
      config: { authMode: "protected" as const },
      schema: { params: paramsRegistrationIdSchema },
    },
    async (request, reply) => {
      const context = documentContextFromRequest(deps, request);
      const result = await getOpdSlipPdf(
        handlerDeps,
        request.tenantId,
        request.params.registrationId,
        context,
      );
      if (!result.ok) return sendDocumentError(reply, result);

      const filename = `opd-slip-${request.params.registrationId}.pdf`;
      return reply
        .header("Content-Type", "application/pdf")
        .header("Content-Disposition", `inline; filename="${filename}"`)
        .send(result.data);
    },
  );

  app.get<{ Params: { registrationId: string }; Querystring: DocumentQuery }>(
    "/registrations/:registrationId/documents/opd-receipt.pdf",
    {
      config: { authMode: "protected" as const },
      schema: { params: paramsRegistrationIdSchema },
    },
    async (request, reply) => {
      const billId = request.query.bill_id?.trim();
      if (!billId) {
        return reply.code(400).send({ error: "bill_id_required" });
      }
      const context = documentContextFromRequest(deps, request);
      const result = await getOpdReceiptPdf(
        handlerDeps,
        request.tenantId,
        request.params.registrationId,
        billId,
        context,
      );
      if (!result.ok) return sendDocumentError(reply, result);

      const filename = `opd-receipt-${billId}.pdf`;
      return reply
        .header("Content-Type", "application/pdf")
        .header("Content-Disposition", `inline; filename="${filename}"`)
        .send(result.data);
    },
  );
}
