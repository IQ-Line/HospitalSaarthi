import type { FastifyInstance } from "fastify";
import type { DbInstance } from "@hims/ts-sdk-db";
import {
  assertOpdRegistrationBillingReportAccess,
  resolveOpdRegistrationBillingReportTenantId,
} from "../http/request-auth-context.js";
import { buildOpdRegistrationBillingWorkbook } from "../lib/build-opd-registration-billing-workbook.js";
import { DrizzleOpdRegistrationBillingReportRepo } from "../data-access/opd-registration-billing-report.repo.js";
import {
  getOpdRegistrationBillingReport,
  parseOpdRegistrationBillingReportQuery,
} from "../use-cases/get-opd-registration-billing-report.js";

type ReportQuery = {
  from_date?: string;
  to_date?: string;
  registration_source?: string;
  page?: string;
  limit?: string;
};

export interface OpdRegistrationBillingReportHandlerDeps {
  db: DbInstance;
}

export function registerOpdRegistrationBillingReportHandler(
  app: FastifyInstance,
  deps: OpdRegistrationBillingReportHandlerDeps,
): void {
  const reportRepo = new DrizzleOpdRegistrationBillingReportRepo(deps.db);

  app.get<{ Querystring: ReportQuery }>(
    "/reports/opd-registration-billing",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      try {
        assertOpdRegistrationBillingReportAccess(request);
      } catch {
        return reply.code(403).send({
          statusCode: 403,
          error: "Forbidden",
          message: "platform super-admin or tenant-admin role is required",
        });
      }
      let query;
      try {
        query = parseOpdRegistrationBillingReportQuery(request.query);
      } catch (err) {
        return reply.code(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: err instanceof Error ? err.message : "Invalid query",
        });
      }

      let reportTenantId: string;
      try {
        reportTenantId = resolveOpdRegistrationBillingReportTenantId(request);
      } catch (err) {
        const statusCode =
          err instanceof Error && "statusCode" in err
            ? (err as Error & { statusCode: number }).statusCode
            : 403;
        return reply.code(statusCode).send({
          statusCode,
          error: statusCode === 400 ? "Bad Request" : "Forbidden",
          message: err instanceof Error ? err.message : "Forbidden",
        });
      }

      const result = await getOpdRegistrationBillingReport(
        { reportRepo },
        reportTenantId,
        query,
      );
      return reply.send(result);
    },
  );

  app.get<{ Querystring: Omit<ReportQuery, "page" | "limit"> }>(
    "/reports/opd-registration-billing/export",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      try {
        assertOpdRegistrationBillingReportAccess(request);
      } catch {
        return reply.code(403).send({
          statusCode: 403,
          error: "Forbidden",
          message: "platform super-admin or tenant-admin role is required",
        });
      }
      let parsed;
      try {
        parsed = parseOpdRegistrationBillingReportQuery({
          ...request.query,
          page: "1",
          limit: "1",
        });
      } catch (err) {
        return reply.code(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: err instanceof Error ? err.message : "Invalid query",
        });
      }

      let reportTenantId: string;
      try {
        reportTenantId = resolveOpdRegistrationBillingReportTenantId(request);
      } catch (err) {
        const statusCode =
          err instanceof Error && "statusCode" in err
            ? (err as Error & { statusCode: number }).statusCode
            : 403;
        return reply.code(statusCode).send({
          statusCode,
          error: statusCode === 400 ? "Bad Request" : "Forbidden",
          message: err instanceof Error ? err.message : "Forbidden",
        });
      }

      const { data } = await reportRepo.listAllRows(reportTenantId, {
        from_date: parsed.from_date,
        to_date: parsed.to_date,
        registration_source: parsed.registration_source,
      });

      const buffer = buildOpdRegistrationBillingWorkbook(data);
      const filename = `opd-registration-billing-${parsed.from_date}-to-${parsed.to_date}.xlsx`;
      return reply
        .header(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        .header("Content-Disposition", `attachment; filename="${filename}"`)
        .send(buffer);
    },
  );
}
