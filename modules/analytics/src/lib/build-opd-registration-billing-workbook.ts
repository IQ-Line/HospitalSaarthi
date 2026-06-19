import * as XLSX from "xlsx";
import type { OpdRegistrationBillingReportRow } from "../domain/opd-registration-billing-report.types.js";

const COLUMN_HEADERS = [
  "PATIENT FULL NAME",
  "UHID",
  "VISIT ID",
  "ABHA NUMBER",
  "ABHA ADDRESS",
  "BILL NUMBER",
  "MOBILE NUMBER",
  "VISIT DATE / TIME",
  "GENDER",
  "DOB, AGE",
  "REGISTERED DOCTOR",
  "CONSULTED DOCTOR",
  "DEPARTMENT",
  "REGISTRATION FEE",
  "OP CONSULTATION FEE",
  "TOTAL FEES COLLECTED",
  "VISIT TYPE",
] as const;

function cell(value: string | null | undefined): string {
  return value ?? "";
}

function rowToSheetValues(row: OpdRegistrationBillingReportRow): string[] {
  return [
    row.patient_full_name,
    row.uhid,
    row.visit_id,
    cell(row.abha_number),
    cell(row.abha_address),
    cell(row.bill_number),
    row.mobile_number,
    row.visit_date_time,
    cell(row.gender),
    row.dob_age,
    cell(row.registered_doctor),
    cell(row.consulted_doctor),
    cell(row.department),
    row.registration_fee,
    row.op_consultation_fee,
    row.total_fees_collected,
    row.visit_type,
  ];
}

export function buildOpdRegistrationBillingWorkbook(
  rows: OpdRegistrationBillingReportRow[],
): Buffer {
  const sheetData: string[][] = [[...COLUMN_HEADERS], ...rows.map(rowToSheetValues)];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "OPD Registration Billing");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export { COLUMN_HEADERS as OPD_REGISTRATION_BILLING_COLUMNS };
