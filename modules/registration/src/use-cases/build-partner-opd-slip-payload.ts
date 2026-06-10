import type { OpdSlipReportRequest } from "@hims/pdf-client";
import type { OPDSlipReportPayload } from "@hims/registration-reports";
import {
  buildReportLayoutConfig,
  splitPatientName,
  type ReportDocumentContext,
} from "../lib/report-document-context.js";

function reportContextFromPartnerBody(body: OpdSlipReportRequest): ReportDocumentContext {
  const facility = body.facility;
  return {
    facilityName: facility.name,
    facilityId: facility.facilityId,
    facilityAddress: facility.address,
    facilityPhone: facility.phone,
    facilityEmail: facility.email,
    footerText: facility.footerText,
    logoUrl: facility.logoUrl,
    departmentName: body.visit.departmentName,
    doctorName: body.doctor.name,
    roomNumber: body.visit.roomNumber,
    patientAddress: body.patient.address,
  };
}

/** Maps partner JSON (`POST /documents/opd-slip.pdf`) to HIMS OPD slip HTML payload. */
export function buildPartnerOpdSlipPayload(body: OpdSlipReportRequest): OPDSlipReportPayload {
  const context = reportContextFromPartnerBody(body);
  const nameParts = splitPatientName(body.patient.name);

  return {
    layoutConfig: buildReportLayoutConfig(context, "OPD Slip"),
    patientId: body.patientId,
    smartParchaPages: body.smartParchaPages ?? [],
    showDoctorSignature: body.showDoctorSignature ?? false,
    smartParchaEnabled: body.smartParchaEnabled ?? true,
    patientData: {
      salutation: body.patient.salutation ?? "",
      firstName: nameParts.firstName,
      middleName: nameParts.middleName,
      lastName: nameParts.lastName,
      gender: body.patient.gender ?? "",
      dateOfBirth: body.patient.dateOfBirth ?? "",
      phoneNumber: body.patient.phoneNumber ?? "",
      uhid: body.patient.uhid,
      abhaNumber: body.patient.abhaNumber,
      abhaAddress: body.patient.abhaAddress,
      addressForDisplay: body.patient.address,
    },
    visitData: {
      visitNumber: body.visit.visitNumber ?? body.visitId,
      createdAt: body.visit.createdAt,
      visitType: body.visit.visitType ?? "opd_first",
      status: body.visit.status ?? "pending",
      consultationType: body.visit.consultationType,
      priority: body.visit.priority,
      department: { name: body.visit.departmentName ?? "NA" },
      doctor: {
        name: body.doctor.name,
        specialization: body.doctor.specialization,
        _id: body.doctorId,
      },
      roomNumber: body.visit.roomNumber,
      tokenNumber: body.visit.tokenNumber,
      fees: body.visit.fees,
      visitValidTill: body.visit.visitValidTill,
    },
    facilityInfo: {
      name: body.facility.name,
      address: body.facility.address,
      phone: body.facility.phone,
      email: body.facility.email,
      facilityId: body.facility.facilityId,
    },
    doctorInfo: {
      name: body.doctor.name,
      qualification: body.doctor.qualification,
      specialization: body.doctor.specialization,
      regNumber: body.doctor.regNumber,
      hprId: body.doctor.hprId,
      signature: body.doctor.signature,
    },
  };
}

export function partnerReportContextFromBody(
  body: OpdSlipReportRequest,
  defaults?: Pick<ReportDocumentContext, "webOrigin" | "logoUrl">,
): ReportDocumentContext {
  return {
    ...reportContextFromPartnerBody(body),
    webOrigin: defaults?.webOrigin,
    logoUrl: body.facility.logoUrl ?? defaults?.logoUrl,
  };
}
