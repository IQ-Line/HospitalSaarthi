import type { OpdSlipDocumentPayload } from "../../domain/opd-slip.types.js";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function billingSection(payload: OpdSlipDocumentPayload): string {
  if (payload.billingLines.length === 0 && !payload.billingTotal) {
    return "";
  }
  const rows = payload.billingLines
    .map(
      (line) =>
        `<tr><td class="label">${escapeHtml(line.description)}</td><td>${escapeHtml(line.amount)}</td></tr>`,
    )
    .join("");
  const totalRow = payload.billingTotal
    ? `<tr><td class="label">Total</td><td><strong>${escapeHtml(payload.billingTotal)}</strong></td></tr>`
    : "";
  return `
  <div class="section-title">Fees</div>
  <table class="info">${rows}${totalRow}</table>`;
}

export function renderOpdSlipHtml(payload: OpdSlipDocumentPayload): string {
  const p = payload;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>OPD Slip</title>
  <style>
    @page { size: A4; margin: 10mm; }
    * { box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #1a1a1a;
      margin: 0;
      padding: 16px;
    }
    .opd-slip-header {
      text-align: center;
      border-bottom: 2px solid #db2777;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .facility-name {
      font-size: 18px;
      font-weight: 700;
      color: #9d174d;
      margin: 0 0 4px;
    }
    .facility-meta {
      font-size: 10px;
      color: #4b5563;
      line-height: 1.5;
    }
    .token-box {
      display: inline-block;
      border: 2px dashed #db2777;
      padding: 8px 20px;
      margin-top: 10px;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 2px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #6b7280;
      margin: 14px 0 6px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 4px;
    }
    table.info {
      width: 100%;
      border-collapse: collapse;
    }
    table.info td {
      padding: 5px 8px;
      vertical-align: top;
      border-bottom: 1px solid #f3f4f6;
    }
    table.info td.label {
      width: 38%;
      font-weight: 600;
      color: #374151;
    }
    .footer-note {
      margin-top: 24px;
      font-size: 9px;
      color: #6b7280;
      text-align: center;
      border-top: 1px solid #e5e7eb;
      padding-top: 10px;
    }
    .badge {
      display: inline-block;
      background: #fce7f3;
      color: #9d174d;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 10px;
    }
  </style>
</head>
<body>
  <header class="opd-slip-header">
    <h1 class="facility-name">${escapeHtml(p.facilityName)}</h1>
    <div class="facility-meta">${escapeHtml(p.facilityMeta)}</div>
    <div class="token-box">${escapeHtml(p.tokenDisplay)}</div>
  </header>

  <div class="section-title">Patient details</div>
  <table class="info">
    <tr><td class="label">Patient name</td><td>${escapeHtml(p.patientName)}</td></tr>
    <tr><td class="label">UHID</td><td>${escapeHtml(p.uhid)}</td></tr>
    <tr><td class="label">Age / Gender</td><td>${escapeHtml(p.ageGender)}</td></tr>
    <tr><td class="label">Mobile</td><td>${escapeHtml(p.phone)}</td></tr>
    <tr><td class="label">ABHA</td><td>${escapeHtml(p.abhaDisplay)}</td></tr>
  </table>

  <div class="section-title">Visit details</div>
  <table class="info">
    <tr><td class="label">Visit number</td><td>${escapeHtml(p.visitNumber)}</td></tr>
    <tr><td class="label">Visit date &amp; time</td><td>${escapeHtml(p.visitDateTime)}</td></tr>
    <tr><td class="label">Visit type</td><td><span class="badge">${escapeHtml(p.visitTypeLabel)}</span></td></tr>
    <tr><td class="label">Department</td><td>${escapeHtml(p.departmentName)}</td></tr>
    <tr><td class="label">Consulting doctor</td><td>${escapeHtml(p.doctorName)}</td></tr>
    <tr><td class="label">Room / Counter</td><td>${escapeHtml(p.roomDisplay)}</td></tr>
    <tr><td class="label">Valid till</td><td>${escapeHtml(p.validTillDisplay)}</td></tr>
    <tr><td class="label">OPD days</td><td>${escapeHtml(p.opdDaysDisplay)}</td></tr>
  </table>
  ${billingSection(p)}

  <div class="section-title">Instructions</div>
  <p style="margin: 0; line-height: 1.5;">${escapeHtml(p.instructions)}</p>

  <footer class="footer-note">Please report to the waiting area with this slip.</footer>
</body>
</html>`;
}
