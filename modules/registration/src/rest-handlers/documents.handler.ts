import type { FastifyInstance } from "fastify";
import type { PdfRendererPort } from "@hims/pdf-client";
import type { BillingReadPort, RegistrationRepo } from "../ports.js";
import { getOpdSlipPdf } from "../use-cases/get-opd-slip-pdf.js";
import { paramsRegistrationIdSchema } from "./route-schemas.js";

export interface DocumentsHandlerDeps {
  registrationRepo: RegistrationRepo;
  billingReadPort: BillingReadPort | undefined;
  pdfRenderer: PdfRendererPort | undefined;
}

export function registerDocumentsHandler(app: FastifyInstance, deps: DocumentsHandlerDeps): void {
  app.get<{ Params: { registrationId: string } }>(
    "/registrations/:registrationId/documents/opd-slip.pdf",
    {
      config: { authMode: "protected" as const },
      schema: { params: paramsRegistrationIdSchema },
    },
    async (request, reply) => {
      const authHeader = request.headers.authorization;
      const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
      const requestIdHeader = request.headers["x-request-id"];
      const requestId =
        typeof requestIdHeader === "string"
          ? requestIdHeader
          : Array.isArray(requestIdHeader)
            ? requestIdHeader[0]
            : undefined;

      const result = await getOpdSlipPdf(
        {
          registrationRepo: deps.registrationRepo,
          billingReadPort: deps.billingReadPort,
          pdfRenderer: deps.pdfRenderer,
        },
        request.tenantId,
        request.params.registrationId,
        { bearerToken, requestId },
      );

      if (!result.ok) {
        if (result.code === "NOT_FOUND") {
          return reply.code(404).send({ error: "Registration not found" });
        }
        if (result.code === "NOT_PRINTABLE") {
          return reply.code(409).send({
            error: "registration_not_printable",
            message: result.message,
          });
        }
        return reply.code(503).send({
          error: "pdf_renderer_unavailable",
          message: result.message,
        });
      }

      const filename = `opd-slip-${request.params.registrationId}.pdf`;
      return reply
        .header("Content-Type", "application/pdf")
        .header("Content-Disposition", `inline; filename="${filename}"`)
        .send(result.pdf);
    },
  );
}
