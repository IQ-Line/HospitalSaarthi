import type { DbInstance } from "@hims/ts-sdk-db";
import { sql } from "@hims/ts-sdk-db";
import {
  displayDoctorName,
  displayOrNa,
  formatDobAge,
  formatInr,
  formatVisitDateTime,
  formatVisitTypeLabel,
} from "../domain/report-formatters.js";
import type {
  OpdRegistrationBillingReportPage,
  OpdRegistrationBillingReportQuery,
  OpdRegistrationBillingReportRow,
  OpdRegistrationBillingReportSummary,
} from "../domain/opd-registration-billing-report.types.js";
import type { OpdRegistrationBillingReportRepo } from "../ports.js";

type RawReportRow = {
  patient_full_name: string;
  patient_uhid: string;
  visit_number: string;
  patient_abha_number: string | null;
  patient_abha_address: string | null;
  bill_number: string | null;
  patient_phone_number: string;
  visit_at: Date;
  patient_gender: string | null;
  patient_date_of_birth: string | null;
  patient_year_of_birth: number | null;
  registered_doctor_name: string | null;
  consulted_doctor_name: string | null;
  department_name: string | null;
  registration_fee: string | number | null;
  consultation_fee: string | number | null;
  total_fees_collected: string | number | null;
  visit_type: string | null;
  is_free_follow_up: boolean;
};

type RawSummaryRow = {
  total_visits: number;
  total_manual: number;
  total_abha: number;
  total_fees: string | number | null;
  registration_fees: string | number | null;
  consultation_fees: string | number | null;
};

function toNumber(value: string | number | null | undefined): number {
  if (value == null) {
    return 0;
  }
  const n = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function sourceFilterSql(source: OpdRegistrationBillingReportQuery["registration_source"]) {
  if (source === "abha") {
    return sql`AND vb.is_abha_registration = true`;
  }
  if (source === "manual") {
    return sql`AND vb.is_abha_registration = false`;
  }
  return sql``;
}

function mapSummary(row: RawSummaryRow): OpdRegistrationBillingReportSummary {
  return {
    total_patients_registered: row.total_visits,
    total_manual_registrations: row.total_manual,
    total_abha_registrations: row.total_abha,
    total_fees_collected: formatInr(toNumber(row.total_fees)),
    registration_fees_collected: formatInr(toNumber(row.registration_fees)),
    consultation_fees_collected: formatInr(toNumber(row.consultation_fees)),
  };
}

function mapRow(row: RawReportRow): OpdRegistrationBillingReportRow {
  return {
    patient_full_name: row.patient_full_name,
    uhid: row.patient_uhid,
    visit_id: row.visit_number,
    abha_number: displayOrNa(row.patient_abha_number),
    abha_address: displayOrNa(row.patient_abha_address),
    bill_number: row.bill_number?.trim() ? row.bill_number : "N/A",
    mobile_number: row.patient_phone_number,
    visit_date_time: formatVisitDateTime(row.visit_at),
    gender: row.patient_gender?.trim() || "—",
    dob_age: formatDobAge(
      row.patient_date_of_birth,
      row.patient_year_of_birth,
      row.visit_at,
    ),
    registered_doctor: row.registered_doctor_name?.trim() || "—",
    consulted_doctor: displayDoctorName(row.consulted_doctor_name),
    department: row.department_name?.trim() || "—",
    registration_fee: formatInr(toNumber(row.registration_fee)),
    op_consultation_fee: formatInr(toNumber(row.consultation_fee)),
    total_fees_collected: formatInr(toNumber(row.total_fees_collected)),
    visit_type: formatVisitTypeLabel(row.visit_type, row.is_free_follow_up),
  };
}

export class DrizzleOpdRegistrationBillingReportRepo implements OpdRegistrationBillingReportRepo {
  constructor(private readonly db: DbInstance) {}

  async getReportPage(
    tenantId: string,
    query: OpdRegistrationBillingReportQuery,
  ): Promise<OpdRegistrationBillingReportPage> {
    const offset = (query.page - 1) * query.limit;
    const summaryRows = await this.querySummary(tenantId, query);
    const total = summaryRows.total_visits;
    const rows = await this.queryRows(tenantId, query, offset);
    const totalPages = query.limit === 0 ? 0 : Math.ceil(total / query.limit);

    return {
      summary: mapSummary(summaryRows),
      data: rows.map(mapRow),
      total,
      page: query.page,
      limit: query.limit,
      total_pages: totalPages,
    };
  }

  async listAllRows(
    tenantId: string,
    query: Omit<OpdRegistrationBillingReportQuery, "page" | "limit">,
  ): Promise<{ summary: OpdRegistrationBillingReportSummary; data: OpdRegistrationBillingReportRow[] }> {
    const summaryRows = await this.querySummary(tenantId, {
      ...query,
      page: 1,
      limit: 1,
    });
    const rows = await this.queryRows(
      tenantId,
      { ...query, page: 1, limit: 100_000 },
      0,
      100_000,
    );
    return {
      summary: mapSummary(summaryRows),
      data: rows.map(mapRow),
    };
  }

  private async querySummary(
    tenantId: string,
    query: OpdRegistrationBillingReportQuery,
  ): Promise<RawSummaryRow> {
    const sourceFilter = sourceFilterSql(query.registration_source);

    const result = await this.db.execute(sql`
      WITH visit_base AS (
        SELECT
          v.id AS visit_uuid,
          (
            COALESCE(NULLIF(TRIM(r.patient_abha_number), ''), NULLIF(TRIM(r.patient_abha_address), ''))
            IS NOT NULL
          ) AS is_abha_registration
        FROM registration.visit v
        INNER JOIN registration.registration r
          ON r.iq_tenant_id = v.iq_tenant_id
         AND r.patient_id = v.patient_id
        WHERE v.iq_tenant_id = ${tenantId}::uuid
          AND date(v.created_at AT TIME ZONE 'Asia/Kolkata') >= ${query.from_date}::date
          AND date(v.created_at AT TIME ZONE 'Asia/Kolkata') <= ${query.to_date}::date
      ),
      filtered_visits AS (
        SELECT vb.*
        FROM visit_base vb
        WHERE 1 = 1
        ${sourceFilter}
      ),
      bill_lines AS (
        SELECT
          b.visit_id,
          COALESCE(SUM(b.net_amount::numeric), 0) AS total_fees_collected,
          COALESCE(SUM(
            CASE
              WHEN lower(bi.item_code) LIKE '%reg%'
                OR lower(COALESCE(bi.description, '')) LIKE '%registration%'
              THEN bi.total_amount::numeric
              ELSE 0
            END
          ), 0) AS registration_fee,
          COALESCE(SUM(
            CASE
              WHEN lower(bi.item_code) LIKE 'cons%'
                OR lower(COALESCE(bi.description, '')) LIKE '%consultation%'
              THEN bi.total_amount::numeric
              ELSE 0
            END
          ), 0) AS consultation_fee
        FROM billing.bills b
        LEFT JOIN billing.bill_items bi
          ON bi.iq_tenant_id = b.iq_tenant_id
         AND bi.bill_id = b.id
         AND bi.status = 'ACTIVE'
        WHERE b.iq_tenant_id = ${tenantId}::uuid
          AND b.status NOT IN ('CANCELLED', 'DRAFT')
        GROUP BY b.visit_id
      )
      SELECT
        COUNT(*)::int AS total_visits,
        COUNT(*) FILTER (WHERE NOT fv.is_abha_registration)::int AS total_manual,
        COUNT(*) FILTER (WHERE fv.is_abha_registration)::int AS total_abha,
        COALESCE(SUM(COALESCE(bl.total_fees_collected, 0)), 0) AS total_fees,
        COALESCE(SUM(COALESCE(bl.registration_fee, 0)), 0) AS registration_fees,
        COALESCE(SUM(COALESCE(bl.consultation_fee, 0)), 0) AS consultation_fees
      FROM filtered_visits fv
      LEFT JOIN bill_lines bl ON bl.visit_id = fv.visit_uuid
    `);

    const row = (result.rows[0] ?? {}) as RawSummaryRow;
    return {
      total_visits: Number(row.total_visits ?? 0),
      total_manual: Number(row.total_manual ?? 0),
      total_abha: Number(row.total_abha ?? 0),
      total_fees: row.total_fees ?? 0,
      registration_fees: row.registration_fees ?? 0,
      consultation_fees: row.consultation_fees ?? 0,
    };
  }

  private async queryRows(
    tenantId: string,
    query: OpdRegistrationBillingReportQuery,
    offset: number,
    limitOverride?: number,
  ): Promise<RawReportRow[]> {
    const limit = limitOverride ?? query.limit;
    const sourceFilter = sourceFilterSql(query.registration_source);

    const result = await this.db.execute(sql`
      WITH visit_base AS (
        SELECT
          v.id AS visit_uuid,
          v.visit_id AS visit_number,
          v.created_at AS visit_at,
          v.visit_type,
          v.is_free_follow_up,
          v.doctor_id AS registered_doctor_id,
          v.department_id,
          r.patient_full_name,
          r.patient_uhid,
          r.patient_abha_number,
          r.patient_abha_address,
          r.patient_phone_number,
          r.patient_gender,
          r.patient_date_of_birth,
          r.patient_year_of_birth,
          (
            COALESCE(NULLIF(TRIM(r.patient_abha_number), ''), NULLIF(TRIM(r.patient_abha_address), ''))
            IS NOT NULL
          ) AS is_abha_registration
        FROM registration.visit v
        INNER JOIN registration.registration r
          ON r.iq_tenant_id = v.iq_tenant_id
         AND r.patient_id = v.patient_id
        WHERE v.iq_tenant_id = ${tenantId}::uuid
          AND date(v.created_at AT TIME ZONE 'Asia/Kolkata') >= ${query.from_date}::date
          AND date(v.created_at AT TIME ZONE 'Asia/Kolkata') <= ${query.to_date}::date
      ),
      filtered_visits AS (
        SELECT vb.*
        FROM visit_base vb
        WHERE 1 = 1
        ${sourceFilter}
      ),
      bill_lines AS (
        SELECT
          b.visit_id,
          MAX(b.bill_number) AS bill_number,
          COALESCE(SUM(b.net_amount::numeric), 0) AS total_fees_collected,
          COALESCE(SUM(
            CASE
              WHEN lower(bi.item_code) LIKE '%reg%'
                OR lower(COALESCE(bi.description, '')) LIKE '%registration%'
              THEN bi.total_amount::numeric
              ELSE 0
            END
          ), 0) AS registration_fee,
          COALESCE(SUM(
            CASE
              WHEN lower(bi.item_code) LIKE 'cons%'
                OR lower(COALESCE(bi.description, '')) LIKE '%consultation%'
              THEN bi.total_amount::numeric
              ELSE 0
            END
          ), 0) AS consultation_fee
        FROM billing.bills b
        LEFT JOIN billing.bill_items bi
          ON bi.iq_tenant_id = b.iq_tenant_id
         AND bi.bill_id = b.id
         AND bi.status = 'ACTIVE'
        WHERE b.iq_tenant_id = ${tenantId}::uuid
          AND b.status NOT IN ('CANCELLED', 'DRAFT')
        GROUP BY b.visit_id
      )
      SELECT
        fv.patient_full_name,
        fv.patient_uhid,
        fv.visit_number,
        fv.patient_abha_number,
        fv.patient_abha_address,
        bl.bill_number,
        fv.patient_phone_number,
        fv.visit_at,
        fv.patient_gender,
        fv.patient_date_of_birth,
        fv.patient_year_of_birth,
        reg_doc.full_name AS registered_doctor_name,
        CASE
          WHEN rx.id IS NOT NULL AND rx.doctor_id IS NOT NULL THEN con_doc.full_name
          ELSE NULL
        END AS consulted_doctor_name,
        dept.name AS department_name,
        COALESCE(bl.registration_fee, 0) AS registration_fee,
        COALESCE(bl.consultation_fee, 0) AS consultation_fee,
        COALESCE(bl.total_fees_collected, 0) AS total_fees_collected,
        fv.visit_type,
        fv.is_free_follow_up
      FROM filtered_visits fv
      LEFT JOIN bill_lines bl ON bl.visit_id = fv.visit_uuid
      LEFT JOIN user_management.users reg_doc
        ON reg_doc.iq_tenant_id = ${tenantId}::uuid
       AND reg_doc.id = fv.registered_doctor_id
      LEFT JOIN opd.prescriptions rx
        ON rx.tenant_id = ${tenantId}::uuid
       AND rx.visit_id = fv.visit_uuid
       AND rx.status <> 'cancelled'
      LEFT JOIN user_management.users con_doc
        ON con_doc.iq_tenant_id = ${tenantId}::uuid
       AND con_doc.id = rx.doctor_id
      LEFT JOIN tenant_master.departments dept
        ON dept.iq_tenant_id = ${tenantId}::uuid
       AND dept.id = fv.department_id
       AND NOT dept.is_deleted
      ORDER BY fv.visit_at DESC, fv.visit_number DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    return result.rows as RawReportRow[];
  }
}
